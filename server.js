const IO_server = require('socket.io');
const io_logic = require('./socketio');

let io;
const myArgs = process.argv.slice(2);

if(myArgs.length > 0 && (myArgs[0] === '-d' || myArgs[0] === '--debug')) {
    io = IO_server(3000);
} else {
    const express = require('express');
    const app = express();
    const server = require('http').Server(app);
    const compression = require('compression');
    io = IO_server(server);

    app.use(
        compression(),
        express.static('dist/', {maxAge: '1y'})
    );

    app.listen(process.env.PORT || 8000);
}

io_logic.init(io);
