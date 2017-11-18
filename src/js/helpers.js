/** Module containing miscellaneous utility functions.
    @module helpers */

/**
 * Return whether the grids are in adjacent position (medium to big screens).
 *
 * @returns {Boolean} true if grids are adjacent, false otherwise.
 */
export function adjacent_grid_mode() {
    return $(window).width() >= 768; // hard-coded bootstrap md-breakpoint
}

/**
 * Trigger a window resize event.
 */
export function trigger_resize() {
    // delayed to give elements time to change before resize is triggered
    setTimeout(() => $(window).trigger('resize'), 10);
}

/**
 * Delete all current socket handlers and register new ones.
 *
 * @param {io.Socket} socket -
 *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
 * @param {Function} setter_cb - callback that registers event handlers.
 */
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

/**
 * Generate a random integer in a specified range.
 *
 * @param {Number} min - Minimum value of the range (inclusive).
 * @param {Number} max - Maximum value of the range (exclusive).
 * @return {Number} Random whole number in specified range, or NaN if
 *                  min >= max.
 */
export function random_in_range(min, max) {
    if(min >= max)
        return NaN;
    return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Select a random alement of an array.
 *
 * @param {Array} arr - Array to select a random element from.
 * @return {any} A random element of the array, or undefined if it is empty.
 */
export function array_choice(arr) {
    return arr[random_in_range(0, arr.length)];
}

/**
 * Return whether a chance in percent succeeded.
 *
 * @param {Number} percent - Success chance in percent.
 * @return {Boolean} True if chance succeeded, false otherwise.
 */
export function chance_in_percent(percent) {
    return Math.random() < percent/100;
}
