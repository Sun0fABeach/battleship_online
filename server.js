const myArgs = process.argv.slice(2);
let io;

if(myArgs.length > 0 && (myArgs[0] === '-d' || myArgs[0] === '--debug')) {
    io = require('socket.io')(3000);
} else {
    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const compression = require('compression');
    io = require('socket.io')(server);

    app.use(
        compression(),
        express.static('dist/', {maxAge: '1y'})
    );

    server.listen(process.env.PORT || 8000);
}


const state_rules = {
    'in lobby':              ['host', 'watch hosts', 'failure unpaired'],
    'watching hosts':        ['unwatch hosts', 'join host', 'failure unpaired'],
    'opened game':           ['close game', 'failure unpaired'],
    'placing ships':         ['placement abort', 'ready', 'failure placement'],
    'awaiting placement':    ['placement abort', 'failure placement'],
    'in battle':             ['shot', 'regame decision', 'failure battle'],
    'requesting regame':     ['regame decision', 'failure regame']
};

let online_count = 0;
const players = {};

io.on('connection', socket => {
    io.sockets.emit('player count', ++online_count);
    socket.on('disconnect', () =>
        io.sockets.emit('player count', --online_count)
    );

    socket.on('name register', (player_name, callback) => {
        if(players[socket.id])
            return;

        if(name_registered(player_name)) {
            callback(false);
            return;
        }

        callback(true);
        const new_player = new Player(player_name, socket);
        players[socket.id] = new_player;
        transition_to_state(new_player, 'in lobby');
    });
});

function name_registered(player_name) {
    for(const id in players)
        if(players[id].name === player_name)
            return true;

    return false;
}

function transition_to_state(player, new_state) {
    player.socket.removeAllListeners();
    listener_registry[new_state](player.socket);
    player.state = new_state;
}

const listener_registry = {
    /* name is registered and player can choose between hosting and joining */
    'in lobby': socket => {
        socket.on('host', (answer_cb) => {
            const player = players[socket.id];
            answer_cb(true); // no reason why hosting should fail as of now
            player.open_game();
            transition_to_state(player, 'opened game');
        });

        socket.on('host watch', (answer_cb) => {
            const player = players[socket.id];
            const hosts = [];

            for(const id in players)
                if(players[id].state === 'opened game')
                    hosts.push(players[id].name_id);

            answer_cb(hosts.length > 0 ? hosts : null);
            player.become_host_watcher();
            transition_to_state(player, 'watching hosts');
        });

        set_failure_handlers(socket);
    },

    /* player is watching the host list */
    'watching hosts': socket => {
        socket.on('host unwatch', () => {
            const player = players[socket.id];
            player.stop_host_watching();
            transition_to_state(player, 'in lobby');
        });

        socket.on('join', (host_id, answer_cb) => {
            const player = players[socket.id];
            const host = players[host_id];

            if(!host || host.state !== 'opened game') {
                answer_cb(false);
                return;
            }

            answer_cb(true);
            player.join_game(host);
            transition_to_state(player, 'placing ships');
            transition_to_state(host, 'placing ships');
        });

        set_failure_handlers(socket);
    },

    /* player is hosting a game and nobody joined yet */
    'opened game': socket => {
        set_abort_handler(socket, false);

        set_failure_handlers(socket, player => player.close_open_game());
    },

    /* players are connected and have to confirm their ship placements */
    'placing ships': socket => {
        set_abort_handler(socket);

        socket.on('ready', (answer_cb) => {
            const player = players[socket.id];

            if(player.opponent.state === 'awaiting placement') {
                answer_cb(true);
                player.tell_opponent_ready();
                transition_to_state(player, 'in battle');
                transition_to_state(player.opponent, 'in battle');
            } else {
                answer_cb(false);
                transition_to_state(player, 'awaiting placement');
            }
        });

        set_failure_handlers(socket, player => {
            if(player.is_host) {
                transition_to_state(player.opponent, 'in lobby');
            } else {
                transition_to_state(player.opponent, 'opened game');
                player.opponent.open_game();
            }
            player.unpair();
        });
    },

    /* player placed his ships, pressed ready and waits for opponent to
       acknowledge her ship placements */
    'awaiting placement': socket => {
        set_abort_handler(socket);

        set_failure_handlers(socket, player => {
            if(player.is_host) {
                transition_to_state(player.opponent, 'in lobby');
            } else {
                transition_to_state(player.opponent, 'opened game');
                player.opponent.open_game();
            }
            player.unpair();
        });
    },

    /* player is in an active battle with an opponent */
    'in battle': socket => {
        set_abort_handler(socket);

        socket.on('shot', (coords, result_cb) => {
            const player = players[socket.id];
            player.shoot(coords, (shot_result) => {
                if(shot_result.defeat) {
                    transition_to_state(player, 'deciding on regame');
                    transition_to_state(player.opponent, 'deciding on regame');
                }
                result_cb(shot_result);
            });
        });

        set_failure_handlers(socket, player => {
            transition_to_state(player.opponent, 'in lobby');
            player.unpair();
        });
    },

    /* after game over, player has to decide if he wants a regame */
    'deciding on regame': socket => {
        set_abort_handler(socket);

        socket.on('wants regame', () => {
            const player = players[socket.id];
            const opponent = player.opponent;
            const opp_wants_regame = opponent.state === 'wants regame';
            player.tell_regame_request();

            if(opp_wants_regame) {
                transition_to_state(player, 'placing ships');
                transition_to_state(opponent, 'placing ships');
            } else {
                transition_to_state(player, 'wants regame');
            }
        });

        set_failure_handlers(socket, player => {
            transition_to_state(player.opponent, 'in lobby');
            player.unpair();
        });
    },

    /* player asked for a regame, opponent has not given an answer yet */
    'wants regame': socket => {
        set_abort_handler(socket);

        set_failure_handlers(socket, player => {
            transition_to_state(player.opponent, 'in lobby');
            player.unpair();
        });
    }
};

function set_abort_handler(socket, paired=true) {
    socket.on('abort', () => {
        const player = players[socket.id];
        if(paired) {
            const battle_states = [
                'in battle', 'deciding on regame', 'wants regame'
            ];
            if(battle_states.includes(player.state) || player.is_host) {
                transition_to_state(player.opponent, 'in lobby');
            } else { // if joiner aborts before battle: host keeps hosting
                transition_to_state(player.opponent, 'opened game');
                player.opponent.open_game();
            }
            player.unpair();
        } else {
            player.close_open_game();
        }
        transition_to_state(player, 'in lobby');
    });
}

function set_failure_handlers(socket, handler_cb) {
    for(const failure_type of ['disconnecting', 'error']) {
        socket.on(failure_type, () => {
            const player = players[socket.id];
            if(handler_cb)
                handler_cb(player);
            delete players[socket.id];
            io.sockets.emit('player count', --online_count);
        });
    }
}


class Player {
    constructor(name, socket) {
        this._name = name;
        this._socket = socket;
        this._id = socket.id;
        this._opponent = null;
        this._state = null;
        this._is_host = false;
    }

    get socket() {
        return this._socket;
    }

    get name() {
        return this._name;
    }

    get name_id() {
        return {name: this.name, id: this._id};
    }

    get opponent() {
        return this._opponent;
    }

    get is_host() {
        return this._is_host;
    }

    get state() {
        return this._state;
    }

    set state(new_state) {
        this._state = new_state;
    }

    become_host_watcher() {
        this._socket.join('host watchers');
    }

    stop_host_watching() {
        this._socket.leave('host watchers');
    }

    to_host_watchers(...args) {
        this._socket.to('host watchers').emit(...args);
    }

    open_game() {
        this._is_host = true;
        this.to_host_watchers('add host', {name: this.name, id: this._id});
    }

    close_open_game() {
        this._is_host = false;
        this.to_host_watchers('remove host', this._id);
    }

    join_game(host) {
        this._is_host = false;
        this._opponent = host;
        host._opponent = this;

        host.send('opponent entered', this.name);
        this.stop_host_watching();
        this.to_host_watchers('remove host', host._id);
    }

    unpair() {
        this._is_host = false;
        this._opponent.send('opponent aborted');
        this._opponent._opponent = null;
        this._opponent = null;
    }

    tell_opponent_ready() {
        this._opponent.send('opponent ready');
    }

    tell_regame_request() {
        this._opponent.send('wants regame');
    }

    shoot(coords, result_cb) {
        this._opponent.send('shot', coords, result_cb);
    }

    send(...args) {
        this._socket.emit(...args);
    }
}
