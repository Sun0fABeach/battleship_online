/**
 * Battle logic.
 * @module battle
 */

import Ship from './classes/ship';
import * as ui from './ui';
import { adjacent_grid_mode } from './helpers';


/** Whether the battle is currently active.
 *  @type {Boolean}
 *  @private
 */
let battle_active;

/**
 * @typedef ShipCount
 * @type {Object}
 * @property {Number} total - Total number of ships (same for either side).
 * @property {Object} intact - Number of intact ships for each player.
 */

/** Total and intact ship numbers for each player
 *  @type {ShipCount}
 *  @private
 */
const ship_count = {
    total: 0,
    intact: {
        player: 0,
        opponent: 0
    }
};

/**
 * Initialize module.
 */
export function init() {
    battle_active = false;
}

/**
 * Activate battle.
 *
 * @param {!Opponent} opponent - interface for interacting with the
 *                              [opponent]{@link module:classes/opponent}
 * @param {!Boolean} player_begins - whether the player takes the first shot.
 */
export function activate(opponent, player_begins) {
    if(battle_active)
        return;

    if(ui.modals.leave_confirm.is_open())
        ui.modals.leave_confirm.close();

    battle_active = true;
    ship_count.total = ui.grids.player.num_ships;
    ship_count.intact.player = ship_count.intact.opponent = ship_count.total;

    if(player_begins) {
        if(adjacent_grid_mode())            // set without actually sliding up
            ui.grids.player.slid_up = true;    // for state consistency
        else
            ui.grids.player.slideUp();
        let_player_shoot(opponent, true);
    } else {
        let_opponent_shoot(opponent, true);
    }
}

/**
 * Deactivate battle.
 */
export function deactivate() {
    if(!battle_active)
        return;

    battle_active = false;
    set_grid_cursor(false);
}

/**
 * Remove shot markers from both grids and revealed ships from opponent grid.
 */
export function clear_grids() {
    clear_opponent_grid();
    clear_player_grid();
    highlight_actor(null);
}

/**
 * Remove shot markers and revealed ships from opponent grid.
 * @private
 */
function clear_opponent_grid() {
    ui.grids.opponent
    .tiles
    .removeClass('ship')
    .children().remove();

    ui.grids.opponent.table.off('click');
}

/**
 * Remove shot markers and from player grid and unregister ship objects.
 * @private
 */
function clear_player_grid() {
    ui.grids.player
    .unregister_ships()
    .tiles
    .children().remove();
}

/**
 * Set/unset cursor style for the opponent grid.
 * @private
 *
 * @param {!Boolean} active - True if specific style is requested, false for
 *                            default cursor
 * @param {String} [type] - Cursor style to be applied. Can be left
 *                          empty if *active* is set to false
 */
function set_grid_cursor(active, type) {
    ui.grids.opponent.table.css('cursor', active ? type : '');
}

/**
 * Allow the player to take on shot at the opponent's grid.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent.Opponent}
 * @param {Boolean} [first_shot=false] - Whether it is the first shot the
 *                                       player takes
 */
function let_player_shoot(opponent, first_shot=false) {
    set_grid_cursor(true, 'crosshair');
    highlight_actor('player');

    ui.grids.opponent.table.one('click', 'td:not(:has(i))', function() {
        ui.menu_buttons.give_up.clickable(false); // disable until shot result
        const $tile = $(this);                    // has been evaluated
        const $shot_marker = $('<i>').addClass('fa');
        $tile.append($shot_marker);
        set_shot_shadow($shot_marker, true, '#bfbfbf'); // indicate fired
        set_grid_cursor(false);                        // shot w/ pending result

        opponent.receive_shot(
            ui.grids.opponent.tile_to_coords($tile),
            (shot_result) => handle_player_shot_result(
                opponent, shot_result, $tile, first_shot
            )
        );
    });
}

/**
 * @typedef ShotResult
 * @type {Object}
 * @property {Boolean} hit - whether the shot is a hit
 * @property {Array} [sunken_ship] - Coordinates of the ship
 *                                   that has been sunk by the shot.
 * @property {Boolean} [defeat] - True if the enemy fleet has been defeated.
 */

/**
 * Evaluate shot result, display it and decide how to continue.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent.Opponent}
 * @param {!ShotResult} shot_result - Information on the effect of shot
 * @param {!jQuery} $tile - Grid tile that has been clicked as
 *                 [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 * @param {!Boolean} first_shot - Whether is was the first shot the player took
 *
 */
function handle_player_shot_result(opponent, shot_result, $tile, first_shot) {
    set_shot_shadow($tile.children('i'), false);

    if(!battle_active) // battle might have been aborted before result arrives
        return;        // (rare networking corner case)

    if(shot_result.sunken_ship) {
        --ship_count.intact.opponent;
        display_sunk_ship_count(first_shot);
    } else if(first_shot) { // switch to displaying score on first shot
        display_sunk_ship_count(true);
    }

    display_shot({
        grid: 'opponent',
        hit: shot_result.hit,
        sunken_ship_coords: shot_result.sunken_ship,
        $tile: $tile
    });

    if(shot_result.defeat) {
        game_over_handler(opponent, true);
    } else {
        ui.menu_buttons.give_up.clickable(true); // re-enable
        if(shot_result.hit)
            let_player_shoot(opponent);
        else
            let_opponent_shoot(opponent);
    }
}

/**
 * Callback used inform the opponent about the result of her shot.
 * @callback ReportResult
 * @param {!ShotResult} shot_result - Information on the effect of the shot
 */

/**
 * Allow the opponent to take on shot.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent.Opponent}
 * @param {Boolean} [first_shot=false] - Whether it is the first shot the
 *                                       opponent takes
 */
function let_opponent_shoot(opponent, first_shot=false) {
    highlight_actor('opponent');
    set_grid_cursor(true, 'not-allowed');

    opponent.let_shoot((coord_pair, report_result_cb) =>
        handle_opponent_shot(opponent, coord_pair, report_result_cb, first_shot)
    );
}

/**
 * Evaluate opponent's shot, display it, inform him about the results and
 * decide how to continue.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent.Opponent}
 * @param {!Array} coord_pair - Shot coordinates
 * @param {!ReportResult} report_result_cb - Callback that will inform the
 *                                           opponent about the shot result
 * @param {!Boolean} first_shot - Whether is was the first of the opponent
 *
 */
function handle_opponent_shot(
    opponent, coord_pair, report_result_cb, first_shot
) {
    if(!battle_active) // might have been aborted before shot arrived
        return;
    if(first_shot)
        display_sunk_ship_count(true);

    const $tile = ui.grids.player.coords_to_tile(coord_pair);
    const ship = ui.grids.player.get_ship($tile);
    const shot_result = ship ? ship.receive_shot(coord_pair) : {hit: false};

    display_shot({
        grid: 'player',
        hit: shot_result.hit,
        sunken_ship_coords: shot_result.sunken_ship,
        $tile: $tile
    });

    if(shot_result.sunken_ship && --ship_count.intact.player === 0) {
        shot_result.defeat = true;
        game_over_handler(opponent, false);
    } else {
        if(shot_result.hit)
            let_opponent_shoot(opponent);
        else
            let_player_shoot(opponent);
    }

    report_result_cb(shot_result);
}

/**
 * Evaluate opponent's shot, display it, inform him about the results and
 * decide how to continue.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent.Opponent}
 * @param {!Boolean} victory - Whether the player won the game
 */
function game_over_handler(opponent, victory) {
    ui.menu_buttons.give_up.clickable(false); //don't allow abort during timeout
    if(ui.modals.leave_confirm.is_open())
        ui.modals.leave_confirm.close(() => delayed_open(victory));
    else
        delayed_open(victory);

    function delayed_open(victory) {
        setTimeout(() => ui.modals.game_over.open(opponent, victory), 700);
    }
}

/**
 * Show how many ships the player sunk as the game message.
 * @private
 *
 * @param {!Boolean} first_shot - Whether it was the first shot taken.
 */
function display_sunk_ship_count(first_shot) {
    let num_sunk = ship_count.total - ship_count.intact.opponent;
    const msg = 'Score: <strong>' +
                num_sunk + '/' + ship_count.total +
                '</strong> ships';
    ui.text.game_msg.set_text(msg);
}

/**
 * @typedef ShotData
 * @type {Object}
 * @property {Boolean} hit - whether the shot is a hit
 * @property {String} grid - the grid that received the shot (can be either
 *                           'player' or 'opponent')
 * @property {!jQuery} $tile - Grid tile that has received the shot as a
 *                   [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 */

/**
 * Mark a grid tile with a hit/miss shot result.
 * @private
 *
 * @param {!ShotData} shot_data - Information on the effect of shot
 */
function display_shot(shot_data) {
    if(adjacent_grid_mode()) {
        mark_shot(shot_data);
        /* set the slid_up state manually here for state consistency. */
        if(shot_data.grid === 'player')
            ui.grids.player.slid_up = !shot_data.hit;
        else
            ui.grids.player.slid_up = shot_data.hit;
    } else {
        display_shot_mobile(shot_data);
    }
}

/* counter to register shots yet to be displayed due to sliding grid */
let pending_shots = 0;

/**
 * Mark a grid tile with a hit/miss shot result on mobile devices. This means
 * sliding the player's grid up/down if necessary.
 * @private
 *
 * @param {!ShotData} shot_data - Information on the effect of shot
 */
function display_shot_mobile(shot_data) {
    if(shot_data.grid === 'player') {
        const mark_to =
        ui.grids.player.slid_up || ui.grids.player.sliding || pending_shots ?
        200 : 0;
        ++pending_shots;

        ui.grids.player.slideDown(() => {
            setTimeout(() => {
                mark_shot(shot_data);
                --pending_shots;
                if(!shot_data.hit) {
                    setTimeout(() => {
                        // battle could be over after timeout due to
                        // defeat or surrender
                        if(battle_active)
                            ui.grids.player.slideUp();
                    }, 800);
                }
            }, mark_to);
        });
    } else {
        /* corner case: immediately having shot, player slid grid down.
           afterwards, the shot result arrives and needs to be displayed.
           to handle this, we always slide up before displaying the shot. */
        const mark_to = ui.grids.player.slid_up ? 0 : 200;
        ui.grids.player.slideUp(() => {
            setTimeout(() => {
                mark_shot(shot_data);
                if(!shot_data.hit)
                    setTimeout(() => ui.grids.player.slideDown(), 800);
            }, mark_to);
        });
    }
}

/**
 * Put a shot marker on the associated tile and perform all due animations.
 * @private
 *
 * @param {!ShotData} shot_data - Information on the effect of shot
 */
function mark_shot(shot_data) {
    const marker_classes = shot_data.hit ? 'fa fa-times' : 'fa fa-bullseye';
    let $marker;

    if(shot_data.grid === 'player') {
        $marker = $('<i>').addClass(marker_classes);
        shot_data.$tile.append($marker);
    } else { // marker element already present from shot indication
        $marker = shot_data.$tile.children('i');
        $marker.addClass(marker_classes);
    }

    const marker_color = $marker.css('color');

    $marker.animate(
        { 'background-color': 'transparent' },
        {
            start: () => {
                $marker.css('background-color', marker_color);
                indicate_recent_shot($marker, marker_color, shot_data.grid);

                if(shot_data.sunken_ship_coords)
                    blow_ship_up(shot_data.sunken_ship_coords, shot_data.grid);
                else if(shot_data.hit)
                    animate_explosion(shot_data.$tile);
            },
            duration: 600
        }
    );
}

/**
 * Mark the most recent shot the player or opponent took.
 * @function
 * @private
 */
const indicate_recent_shot = function() {
    const prev_shot_marker = {
        player: null,
        opponent: null
    };

    return function($marker, color, side) {
        if(prev_shot_marker[side])
            prev_shot_marker[side].css('box-shadow', '');

        set_shot_shadow($marker, true, color);
        prev_shot_marker[side] = $marker;
    };
}();

/**
 * Add or remove a CSS shadow on a tile.
 * @private
 *
 * @param {!jQuery} $element - Grid tile that has received a shot as
 *                  [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 * @param {!Boolean} active - Whether to add or remove the shot shadow
 * @param {!String} color - CSS color of the shadow
 */
function set_shot_shadow($element, active, color) {
    if(active)
        $element.css('box-shadow', '0 0 0.6rem 0.2rem ' + color + ' inset');
    else
        $element.css('box-shadow', '');
}

/**
 * Animate a hit on a tile using a spritesheet.
 * @private
 *
 * @property {!jQuery} $tile - Grid tile that has received the shot as a
 *                   [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 */
function animate_explosion($tile) {
    const $sprite_container = $('<div>')
        .addClass('sprite-container explosion')
        .appendTo($tile);
    const offset = $sprite_container.outerWidth();
    const delay = 50;
    const num_sprites = 16;
    const spritesheet_row_length = 4;


    for(let i = 1; i < num_sprites; ++i) {
      setTimeout(() => {
        $sprite_container.css(
          'background-position',
          -(i%spritesheet_row_length * offset) + 'px ' +
          -(Math.floor(i/spritesheet_row_length) * offset) + 'px'
        );
      }, i * delay);
    }

    setTimeout(() => $sprite_container.remove(), num_sprites * delay);
}

/**
 * Blow up a ship b/c it was sunk. If it was a ship of the opponent, also
 * reveal it.
 * @private
 *
 * @param {!Array} ship_coords - Coordinates of the ship.
 */
function blow_ship_up(ship_coords, grid_type) {
    const reveal_ship = grid_type === 'opponent';

    for(const coord_pair of ship_coords) {
        const $tile = ui.grids[grid_type].coords_to_tile(coord_pair);
        animate_explosion($tile);
        if(reveal_ship)
            $tile.addClass('ship');
    }
}

/**
 * Highlight which player has to take a shot next.
 * @private
 *
 * @param {!String} actor - Which side to highlight (can be either 'player' or
 *                          'opponent')
 */
function highlight_actor(actor) {
    if(!actor) {
        ui.grids.opponent.highlight(false);
        ui.grids.player.highlight(false);
        return;
    }

    const waiter = actor === 'player' ? 'opponent' : 'player';

    if(adjacent_grid_mode()) {
        ui.grids[actor].highlight(false);
        ui.grids[waiter].highlight(true);
    } else { // even though we don't highlight, we keep state consistency:
        ui.grids[actor].highlight_state = false;
        ui.grids[waiter].highlight_state = true;
    }
}

// there is no highlighting on small devices, so make sure to dis/enable
// highlighting on mobile/desktop devices and remember the highlighting state
$(window).resize(function() {
    if(battle_active) {
        if(adjacent_grid_mode()) {
            ui.grids.player.highlight_from_state();
            ui.grids.opponent.highlight_from_state();
        } else {
            ui.grids.player.highlight(false, false);
            ui.grids.opponent.highlight(false, false);
        }
    }
});
