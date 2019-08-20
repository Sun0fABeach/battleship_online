/** Classes for opponent interaction (AI or human).
    @module classes/opponent
*/

import { ShipPlacement } from './ship_placement';
import { equal_coords, array_choice, remove_from_array } from '../helpers';
import { grids } from '../ui';


/**
 * @callback ReadyAction
 * @property {Boolean} other_ready - Whether opponent is already ready.
 * @property {Boolean} player_begins - Whether player takes the first shot.
 */


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


/** Interface for interacting with a human opponent via socket.
 *  @extends Opponent */
class HumanOpponent extends Opponent {
    /**
     * Create a HumanOpponent instance.
     *
     * @param {!io.Socket} socket -
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


/** Interface for interacting with an AI opponent.
 *  @abstract
 *  @extends Opponent */
class AIOpponent extends Opponent {
    /**
     * Create an AIOpponent instance.
     */
    constructor() {
        super();
        this._offsets = {
            hor_vert: [
                        [0, -1],
                [-1, 0],        [1, 0],
                        [0, 1]
            ]
        };
        this._setup_instance();
    }

    /**
     * Setup random ship placement and initialize ship objects.
     */
    _setup_instance() {
        this._ship_placement = new ShipPlacement();
        this._intact_ships = Array.from(this._ship_placement.ships);
        this._intact_ships.forEach(ship => ship.prepare_for_battle());
        this._total_coords_list = grids.player.coords_map().reduce(
            (list, coord_pair) => list.concat(coord_pair), []
        );
        this._hit_stack = [];
    }

    /**
     *  Tell AI that player is ready to start the game. The AI always replies
     *  that it is ready and that the player shall take the first shot.
     *
     *  @param {!ReadyAction} action - Reply callback.
     */
    tell_ready(action) {
        action(true, true);
    }

    /**
     * Reinitialize random ship placement and ship objects.
     */
    tell_regame() {
        this._setup_instance();
    }

    /**
     *  Receive player shot and inform him on the result.
     *
     *  @param {!Array} coords - Shot coordinates.
     *  @param {!Function} result_handler - Reply callback used to inform the
     *                                      player on the shot result.
     */
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

    /**
     *  Let the AI take a shot.
     *
     *  @param {!Function} shot_handler - Reply callback used to tell the player
     *                     the shot coordinates. Also provides a callback
     *                     argument that needs to be called to inform the AI on
     *                     the shot result.
     */
    let_shoot(shot_handler) {
        setTimeout(() => {
            /* what _shot_options() will return is dependent on
             * the difficulty class */
            const shot_coords = array_choice(this._shot_options());

            // remove shot from list of shot coordinate options:
            this._total_coords_list.find((coord_pair, idx, list) => {
                if(equal_coords(coord_pair, shot_coords)) {
                    list.splice(idx, 1);
                    return true;
                }
            });

            /* what _evaluate_shot_result() will do is dependent on the
             * difficulty class */
            shot_handler(shot_coords, shot_result =>
                this._evaluate_shot_result(shot_coords, shot_result)
            );
        }, 1000);
    }

    /**
     *  Provide a list of coordinates that are sensible options for the next
     *  shot. If a shit has recently been hit, but not sunk, the options will
     *  contain coordinates in the vicinity of this ship. Otherwise, the options
     *  will be other coordinates that have not been targeted so far.
     */
    _shot_options() {
        if(this._hit_stack.length === 0)
            return this._total_coords_list;

        while(true) {
            const shot_options = [];
            const hit_pair = this._hit_stack[this._hit_stack.length - 1];

            grids.player.surrounding_coords_do(
                /* what _sensible_offsets() will return is dependent on
                * the difficulty class */
                ...hit_pair, this._sensible_offsets(),
                (coord_pair, $tile) => {
                    if($tile.children('i').length === 0)
                        shot_options.push(coord_pair);
                }
            );

            if(shot_options.length > 0) {
                return shot_options;
            } else {
                // dead end on one side of the ship, so backtrack hit coords
                this._hit_stack.pop();
            }
        }
    }
}


/** AI opponent on easy difficulty.
 *  @extends AIOpponent */
class AIOpponentEasy extends AIOpponent {
    /**
     * Return offsets to be used for calculating the next shot position when a
     * ship has previously been hit, but not sunk yet. In this case, it is any
     * adjacent horizontal or vertical offset.
     *
     * @returns {!Array} Offsets for calculating the next shot position
     */
    _sensible_offsets() {
        return this._offsets.hor_vert;
    }

    /**
     * Make preparations for the next shot by evaluating the results of the
     * current shot.
     *
     * @param {!Array} shot_coords - Coordinates of the shot
     * @param {!Object} shot_result - Results of the shot
     */
    _evaluate_shot_result(shot_coords, shot_result) {
        if(shot_result.hit) {
            if(shot_result.sunken_ship)
                this._hit_stack = [];
            else
                this._hit_stack.push(shot_coords);
        }
    }
}

/** AI opponent on normal difficulty.
 *  @extends AIOpponent */
class AIOpponentNormal extends AIOpponent {
    /**
     * Create an AIOpponentNormal instance.
     */
    constructor() {
        super();
        this._hit_coords = [];
        this._offsets.vert = [[0, -1], [0, 1]];
        this._offsets.hor = [[-1, 0], [1, 0]];
        this._offsets.all = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
    }

    /**
     * Reinitialize random ship placement and ship objects.
     */
    tell_regame() {
        super.tell_regame();
        this._hit_coords = [];
    }

    /**
     * Return offsets to be used for calculating the next shot position when a
     * ship has previously been hit, but not sunk yet.
     *
     * @returns {!Array} Offsets for calculating the next shot position
     */
    _sensible_offsets() {
        if(this._hit_coords.length === 1)  // first hit on ship w/ size > 1
            return this._offsets.hor_vert;
        else if(this._hit_coords[0][0] === this._hit_coords[1][0])
            return this._offsets.vert;
        else
            return this._offsets.hor;
    }

    /**
     * Make preparations for the next shot by evaluating the results of the
     * current shot.
     *
     * @param {!Array} shot_coords - Coordinates of the shot
     * @param {!Object} shot_result - Results of the shot
     */
    _evaluate_shot_result(shot_coords, shot_result) {
        if(shot_result.hit) {
            if(shot_result.sunken_ship) {
                const surrounding_coords = this._untouched_surrounding_coords(
                    shot_result.sunken_ship
                );
                // remove coords surrounding ship from list of shot options
                this._total_coords_list =
                this._total_coords_list.filter(list_pair =>
                    !surrounding_coords.some(comp_pair =>
                        equal_coords(list_pair, comp_pair)
                    )
                );
                this._hit_stack = [];
                this._hit_coords = [];
            } else {
                this._hit_stack.push(shot_coords);
                this._hit_coords.push(shot_coords);
            }
        }
    }

    /**
     * Obtain a list of coordinates surrounding the given ship coordinates,
     * excluding any positions that have already received a shot.
     *
     * @param {!Array} ship_coords - Coordinates of the ship
     */
    _untouched_surrounding_coords(ship_coords) {
        const surrounding_coords = [];
        ship_coords.forEach(ship_pair => {
            grids.player.surrounding_coords_do(
                ...ship_pair, this._offsets.all,
                (adjacent_pair, $tile) => {
                    if($tile.children('i').length > 0)
                        return; // skip previously targeted tiles
                    if(surrounding_coords.some(coord_pair =>
                        equal_coords(coord_pair, adjacent_pair)
                    ))
                        return; // don't collect coords twice

                    surrounding_coords.push(adjacent_pair);
                }
            );
        });

        return surrounding_coords;
    }
}


export { HumanOpponent, AIOpponent, AIOpponentEasy, AIOpponentNormal };


/* Ideas for hard AI:
 * - when ship is hit and not sunk yet, filter out shot option coords that have
 *   been excluded from the total_coords_list
 * - checkerboard pattern seeking
 */
