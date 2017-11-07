export function adjacent_grid_mode() {
    return $(window).width() >= 768; // hard-coded bootstrap md-breakpoint
}

export function trigger_resize() {
    // delayed to give elements time to change before resize is triggered
    setTimeout(() => $(window).trigger('resize'), 10);
}

export function swap_in_socket_handlers(socket, setter_cb) {
    socket.off();

    socket.on('connect_error', error_screen);
    socket.on('connect_timeout', error_screen);
    socket.on('error', error_screen);
    socket.on('player count', num_players => update_player_count(num_players));

    if(setter_cb)
        setter_cb(socket);
}

function error_screen(error) {
    $('body').empty().append(
        $('<h1>').text(error).css('text-align', 'center')
    );
}

function update_player_count(num_players) {
    const p = num_players === 1 ? ' player ' : ' players ';
    $('#player-count').text(num_players + p + 'online');
}
