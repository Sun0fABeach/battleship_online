var io = require('socket.io')(3000);

io.on('connection', (socket) => {
    console.log('user connected');

    socket.emit('hello', 'hello from server');

    socket.on('message', function(msg) {
        console.log(msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('error', (error) => {
        console.log('error: ' + error);
    });
});
