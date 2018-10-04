const IO_server = require('socket.io');
const io_logic = require('./socketio');
const http = require('http');
const express = require('express');
const path = require('path');
const ejs = require('ejs');


let io;
const app = express();
const server = http.Server(app);

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

app.get(/^\/(_?(help|imprint))$/, (req, res) => {
    res.render(req.params[0]);
});

const myArgs = process.argv.slice(2);

if(myArgs.length > 0 && (myArgs[0] === '-d' || myArgs[0] === '--debug')) {
    io = IO_server(3000); // webpack dev server does the static file serving
} else {
    const compression = require('compression');
    io = IO_server(server);

    app.use(
        compression(),
        express.static('dist/', {maxAge: '1y'})
    );
}

io_logic.init(io);

const port = process.env.PORT || 8000;
server.listen(port);
console.log(`http://localhost:${port}`);
