var io = require('socket.io')(3000);

const players = {};

io.on('connection', (socket) => {
    socket.on('name register', (player_name) => {
        setTimeout(() => {
            if(players[socket.id])
                return;

            if(name_registered(player_name)) {
                socket.emit('name taken');
                return;
            }

            players[socket.id] = {name: player_name};
            socket.emit('name accepted')
        }, 800);
    });

    socket.on('host', () => {
        setTimeout(() => {
            const player_data = players[socket.id];
            if(!player_data)
                return;
            if(player_data.is_host) {
                socket.emit('host failed', 'id duplicate');
                return;
            }
            player_data.is_host = true;
            socket.emit('host success');
            socket.to('host watchers').emit(
                'add host', {name: player_data.name, id: socket.id}
            );
        }, 800);
    });

    socket.on('abort', () => {
        const player_data = players[socket.id];
        if(!player_data || !player_data.is_host)
            return;
        player_data.is_host = false;
        socket.to('host watchers').emit('remove host', socket.id);
    });

    socket.on('host watch', (callback) => {
        setTimeout(() => {
            if(!players[socket.id] || players[socket.id].is_host)
                return;

            const hosts = [];

            for(const id in players)
                if(players.hasOwnProperty(id))
                    if(players[id].is_host)
                        hosts.push({name: players[id].name, id});

            callback(hosts.length > 0 ? hosts : null);
            socket.join('host watchers');
        }, 1200);
    });

    socket.on('host unwatch', () => {
        if(!players[socket.id])
            return;
        socket.leave('host watchers');
    });

    socket.on('disconnecting', () => {
        const player_data = players[socket.id];

        if(player_data) {
            if(player_data.is_host) {
                socket.to('host watchers').emit(
                    'remove host', {name: player_data.name, id: socket.id}
                );
            }
            delete players[socket.id];
        }
    });

    socket.on('error', (error) => {
        const player_data = players[socket.id];

        if(player_data) {
            if(player_data.is_host) {
                socket.to('host watchers').emit(
                    'remove host', {name: player_data.name, id: socket.id}
                );
            }
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
