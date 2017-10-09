var io = require('socket.io')(3000);

const hosts = {};
let h = 0;

io.on('connection', (socket) => {
    socket.on('host', (player_name) => {
        setTimeout(() => {
            if(h++ % 2 === 0) {
                socket.emit('host failed', 'id duplicate')
            } else {
                socket.emit('host success')
                hosts[socket.id] = player_name;
            }
        }, 1000);
    });

    socket.on('abort', () => {
        delete hosts[socket.id];
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('error', (error) => {
        console.log('error: ' + error);
    });
});
