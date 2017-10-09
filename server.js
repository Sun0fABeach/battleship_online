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
        }, 800);
    });

    socket.on('abort', () => {
        delete players[socket.id];
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });

    socket.on('error', (error) => {
        delete players[socket.id];
    });
});

function name_registered(player_name) {
    for(const id in players)
        if(players.hasOwnProperty(id))
            if(players[id] === player_name)
                return true;

    return false;
}
