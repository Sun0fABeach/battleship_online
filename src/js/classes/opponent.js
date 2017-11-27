/** Classes for opponent interaction (AI or human).
    @module classes/opponent
*/

import { ShipPlacement } from './ship_placement';
import { array_choice, remove_from_array } from '../helpers';
import { grids } from '../ui';

/** Interface for interacting with a human opponent via socket. */
export class HumanOpponent {
    /**
     * Create a HumanOpponent instance.
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
        // player will begin if opponent not rdy yet
        this._socket.emit('ready', other_ready =>
            action(other_ready, !other_ready)
        );
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

/** Interface for interacting with an AI opponent. */
export class AIOpponent { // TODO: proper subclassing, interfacing ?
    /**
     * Create an AIOpponent instance.
     */
    constructor() {
        this._setup_instance();
    }

    _setup_instance() {
        this._ship_placement = new ShipPlacement();
        this._intact_ships = Array.from(this._ship_placement.ships);
        this._intact_ships.forEach(ship => ship.prepare_for_battle());
        this._player_coords_list = grids.player.coords_map().reduce(
            (list, coord_pair) => list.concat(coord_pair), []
        );
    }

    /* dummied - out methods */
    tell_abort() {}
    set_abort_handler() {}
    set_ready_handler() {}
    set_regame_handler() {}

    tell_ready(action) {
        action(true, true); // ai always rdy and player always begins
    }

    tell_regame() {
        this._setup_instance();
    }

    receive_shot(coords, result_handler) {
        let shot_result;
        const hit_ship = this._intact_ships.find(ship => {
            shot_result = ship.receive_shot(coords);
            return shot_result.hit;
        });
        if(shot_result.sunken_ship) {
            remove_from_array(this._intact_ships, hit_ship);
            if(this._intact_ships.length === 0)
                shot_result.defeat = true;
        }
        result_handler(shot_result);
    }

    let_shoot(shot_handler) {
        setTimeout(() => {
            let shot_options = [];

            if(this._hit_ship_coords) {
                const sensible_offsets = [
                            [0, -1],
                    [-1, 0],        [1, 0],
                            [0, 1]
                ];
                const [x, y] = this._hit_ship_coords;
                // TODO: dryness with _surrounding_coords_do
                const sensible_coords = sensible_offsets.map(
                    ([x_off, y_off]) => [x + x_off, y + y_off]
                );
                for(const coord_pair of sensible_coords) {
                    const $tile = grids.player.coords_to_tile(coord_pair);
                    // exclude off-grid & already shot at coords
                    if($tile && $tile.children('i').length === 0)
                        shot_options.push(coord_pair);
                }
            }

            if(shot_options.length === 0)
                shot_options = this._player_coords_list;

            const shot_coords = array_choice(shot_options);
            this._player_coords_list.find((coord_pair, idx, list) => {
                if(this._equal_coords(coord_pair, shot_coords)) {
                    list.splice(idx, 1);
                    return true;
                }
            });

            shot_handler(shot_coords, shot_result => {
                if(shot_result.hit) {
                    if(shot_result.sunken_ship)
                        this._hit_ship_coords = null;
                    else
                        this._hit_ship_coords = shot_coords;
                }
            });
        }, 1000); // TODO: timeout variation?
    }

    _equal_coords(a, b) { // TODO: dryness ...
        return a[0] === b[0] && a[1] === b[1];
    }
}
