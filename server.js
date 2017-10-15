var io = require('socket.io')(3000);

const players = {};

io.on('connection', (socket) => {
    socket.on('name register', (player_name, callback) => {
        if(players[socket.id])
            return;

        if(name_registered(player_name)) {
            callback(false);
            return;
        }

        players[socket.id] = new Player(player_name, socket);
        callback(true);
    });

    socket.on('host', (callback) => {
        const player = players[socket.id];
        if(!player)
            return;
        if(player.game_open()) {
            callback(false, 'id duplicate');
            return;
        }
        player.open_game();
        callback(true);
    });

    socket.on('abort', () => {
        const player = players[socket.id];
        if(!player)
            return;
        player.handle_goodbye();
    });

    socket.on('host watch', (callback) => {
        const player = players[socket.id];
        if(!player || player.game_open())
            return;

        const hosts = [];

        for(const id in players)
            if(players.hasOwnProperty(id))
                if(players[id].game_open())
                    hosts.push(players[id].name_id);

        callback(hosts.length > 0 ? hosts : null);

        player.become_host_watcher();
    });

    socket.on('host unwatch', () => {
        const player = players[socket.id];
        if(!player)
            return;
        player.stop_host_watching();
    });

    socket.on('join', (host_id, joiner_name, callback) => {
        const player = players[socket.id];
        const host = players[host_id];

        if(!player || player.game_open() || player.is_paired())
            return;
        if(!host || !host.game_open()) {
            callback(false);
            return;
        }

        player.pair_with(host);

        callback(true);
    });

    socket.on('ready', (callback) => {
        const player = players[socket.id];

        if(!player || !player.is_paired() || player.ready)
            return;

        callback(player.set_ready());
    });

    socket.on('shot', (coords, result_cb) => {
        const player = players[socket.id];

        if(!player || !player.is_paired() || !player.ready)
            return;

        player.shoot(coords, result_cb);
    });

    socket.on('give up', () => {
        const player = players[socket.id];
        if(!player)
            return;
        player.handle_goodbye();
    });

    socket.on('disconnecting', () => {
        const player = players[socket.id];

        if(player) {
            player.handle_goodbye();
            delete players[socket.id];
        }
    });

    socket.on('error', (error) => {
        const player = players[socket.id];

        if(player) {
            player.handle_goodbye();
            delete players[socket.id];
        }
    });
});


function name_registered(player_name) {
    for(const id in players)
        if(players.hasOwnProperty(id))
            if(players[id].name === player_name)
                return true;

    return false;
}


class Player {
    constructor(name, socket) {
        this._name = name;
        this._socket = socket;
        this._game_open = false;
        this._opponent = null;
        this._ready = false;
    }

    get name() {
        return this._name;
    }

    get id() {
        return this._socket.id;
    }

    get name_id() {
        return {name: this.name, id: this.id};
    }

    get ready() {
        return this._ready;
    }

    game_open() {
        return this._game_open;
    }

    open_game() {
        this.to_host_watchers('add host', {name: this.name, id: this.id});
        this._game_open = true;
    }

    close_open_game() {
        this.to_host_watchers('remove host', this.id);
        this._game_open = false;
    }

    pair_with(host) {
        this._opponent = host;
        host._opponent = this;
        host._game_open = false;

        host.send('opponent entered', this.name);
        this.to_host_watchers('remove host', host.id);
    }

    unpair() {
        if(this.ready && this._opponent.ready) // ongoing battle
            this._opponent.send('opponent gave up');
        else
            this._opponent.send('opponent aborted');

        this._opponent._opponent = null;
        this._opponent._ready = false;
        this._opponent = null;
        this._ready = false;
    }

    is_paired() {
        return !!this._opponent;
    }

    handle_goodbye() {
        if(this.game_open())
            this.close_open_game();
        else if(this.is_paired())
            this.unpair();
    }

    send(...args) {
        this._socket.emit(...args);
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

    set_ready() {
        this._ready = true;

        if(this._opponent.ready) {
            this._opponent.send('opponent ready');
            return true;
        }

        return false;
    }

    shoot(coords, result_cb) {
        this._opponent.send('shot', coords, result_cb);
    }
}
