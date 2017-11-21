/** Classes for opponent interaction (AI or human).
    @module classes/opponent
*/

/** Interface for interacting with the opponent. */
export class Opponent {
    /**
     * Create an Opponent instance.
     * @param {io.Socket} socket -
     *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
     */
    constructor(socket) {
        this._socket = socket;
    }

    tell_abort() {
        this._socket.emit('abort');
    }

    set_abort_handler(action) {
        this._socket.on('opponent aborted', action);
    }

    tell_ready(action) {
        this._socket.emit('ready', other_ready => action(other_ready));
    }

    set_ready_handler(action) {
        this._socket.on('opponent ready', action);
    }

    tell_regame() {
        this._socket.emit('wants regame');
    }

    set_regame_handler(action) {
        this._socket.on('wants regame', action);
    }

    let_shoot(shot_handler) {
        this._socket.once('shot', (coord_pair, inform_result_cb) =>
            shot_handler(coord_pair, inform_result_cb)
        );
    }

    receive_shot(coords, result_handler) {
        this._socket.emit('shot', coords, shot_result =>
            result_handler(shot_result)
        );
    }
}
