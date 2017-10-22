export function adjacent_grid_mode() {
    return $(window).width() >= 768; // hard-coded bootstrap md-breakpoint
}

export function swap_in_socket_handlers(socket, setter_cb) {
    socket.off();

    socket.on('connect_error', error_screen);
    socket.on('connect_timeout', error_screen);
    socket.on('error', error_screen);

    if(setter_cb)
        setter_cb(socket);
}

function error_screen(error) {
    $('body').empty().append(
        $('<h1>').text(error).css('text-align', 'center')
    );
}
