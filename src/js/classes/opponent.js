/** Classes for opponent interaction (AI or human).
    @module classes/opponent
*/

import { ShipPlacement } from './ship_placement';
import { equal_coords, array_choice, remove_from_array } from '../helpers';
import { grids } from '../ui';

/** Opponent base class. Super classes that don't overwrite any of the given
 *  methods will let them have no effect.
 *  @abstract */
class Opponent {
    tell_abort() {}
    set_abort_handler() {}
    tell_ready() {}
    set_ready_handler() {}
    tell_regame() {}
    set_regame_handler() {}
    let_shoot() {}
    receive_shot() {}
}

/** Interface for interacting with a human opponent via socket. */
export class HumanOpponent extends Opponent {
    /**
     * Create a HumanOpponent instance.
     * @param {io.Socket} socket -
     *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
     */
    constructor(socket) {
        super();
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
export class AIOpponent extends Opponent {
    /**
     * Create an AIOpponent instance.
     */
    constructor() {
        super();
        this._setup_instance();
    }

    _setup_instance() {
        this._ship_placement = new ShipPlacement();
        this._intact_ships = Array.from(this._ship_placement.ships);
        this._intact_ships.forEach(ship => ship.prepare_for_battle());
        this._player_coords_list = grids.player.coords_map().reduce(
            (list, coord_pair) => list.concat(coord_pair), []
        );
        this._hit_coords = [];
    }

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
            const shot_coords = array_choice(this._shot_options());
            this._player_coords_list.find((coord_pair, idx, list) => {
                if(equal_coords(coord_pair, shot_coords)) {
                    list.splice(idx, 1);
                    return true;
                }
            });

            shot_handler(shot_coords, shot_result => {
                if(shot_result.hit) {
                    if(shot_result.sunken_ship)
                        this._hit_coords = [];
                    else
                        this._hit_coords.push(shot_coords);
                }
            });
        }, 1000);
    }

    _shot_options() {
        if(this._hit_coords.length === 0)
            return this._player_coords_list;

        const sensible_offsets = [
                    [0, -1],
            [-1, 0],        [1, 0],
                    [0, 1]
        ];

        while(true) {
            const shot_options = [];
            const hit_pair = this._hit_coords[this._hit_coords.length - 1];
            /* jshint ignore:start */
            grids.player.surrounding_coords_do(...hit_pair, sensible_offsets,
                (coord_pair, $tile) => {
                    if($tile.children('i').length === 0)
                        shot_options.push(coord_pair);
                }
            );
            /* jshint ignore:end */
            if(shot_options.length > 0) {
                return shot_options;
            } else {
                // dead end on one side of the ship, so backtrack hit coords
                this._hit_coords.pop();
            }
        }
    }
}
