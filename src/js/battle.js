/**
 * Battle logic.
 * @module battle
 */

import Ship from './classes/ship';
import BattleStats from './classes/battle_stats';
import * as ui from './ui';
import { adjacent_grid_mode, random_in_range } from './helpers';


/** Whether the battle is currently active.
 *  @type {Boolean}
 *  @private
 */
let battle_active;

/** The [statistics]{@link module:classes/battle_stats~BattleStats} for the
 *  current battle.
 *  @type {BattleStats}
 *  @private
 */
let battle_stats;


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
 *                           [opponent]{@link module:classes/opponent~Opponent}
 * @param {!Boolean} player_begins - whether the player takes the first shot.
 */
export function activate(opponent, player_begins) {
    if(battle_active)
        return;

    if(ui.modals.leave_confirm.is_open())
        ui.modals.leave_confirm.close();

    battle_active = true;
    battle_stats = new BattleStats(ui.grids.player.num_ships);

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
 *                      The [opponent]{@link module:classes/opponent~Opponent}
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
 * @property {Boolean} [defeat] - True if the fleet has been defeated.
 */

/**
 * Evaluate shot result, display it and decide how to continue.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent~Opponent}
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

    record_shot(shot_result, 'player');

    if(shot_result.sunken_ship || first_shot)
        display_sunk_ship_count();

    display_shot({
        grid: 'opponent',
        hit: shot_result.hit,
        sunken_ship_coords: shot_result.sunken_ship,
        $tile: $tile
    });

    if(shot_result.defeat) {
        handle_game_over(opponent, true);
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
 *                      The [opponent]{@link module:classes/opponent~Opponent}
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
 *                      The [opponent]{@link module:classes/opponent~Opponent}
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
        display_sunk_ship_count();

    const $tile = ui.grids.player.coords_to_tile(coord_pair);
    const ship = ui.grids.player.get_ship($tile);
    const shot_result = ship ? ship.receive_shot(coord_pair) : {hit: false};

    record_shot(shot_result, 'opponent');

    display_shot({
        grid: 'player',
        hit: shot_result.hit,
        sunken_ship_coords: shot_result.sunken_ship,
        $tile: $tile
    });

    if(battle_stats.ships_to_sink('opponent') === 0) {
        shot_result.defeat = true;
        handle_game_over(opponent, false);
    } else {
        if(shot_result.hit)
            let_opponent_shoot(opponent);
        else
            let_player_shoot(opponent);
    }

    report_result_cb(shot_result);
}

/**
 * Record the shot result to the
 * [statistics]{@link module:classes/battle_stats~BattleStats}.
 * @private
 *
 * @param {!ShotResult} shot_result - Information on the effect of shot
 * @param {!String} shooter - The side who's shot shall be recorded (either
 *                              'player' or 'opponent')
 */
function record_shot(shot_result, shooter) {
    if(shot_result.hit) {
        battle_stats.record_hit(shooter);
        if(shot_result.sunken_ship)
            battle_stats.record_sunk_ship(shooter);
    } else {
        battle_stats.record_miss(shooter);
    }
}

/**
 * Display game over animation and ask the player for a regame.
 * @private
 *
 * @param {!Opponent} opponent -
 *                      The [opponent]{@link module:classes/opponent~Opponent}
 * @param {!Boolean} victory - Whether the player won the game
 */
function handle_game_over(opponent, victory) {
    ui.menu_buttons.give_up.clickable(false); //don't allow abort during timeout

    const fleet_explosion_delay = 800;
    const fleet_explosion_duration = 2000;
    const modal_delay = fleet_explosion_delay + fleet_explosion_duration + 700;

    setTimeout(() =>
        blow_fleet_up(
            ui.grids[victory ? 'opponent' : 'player'],
            fleet_explosion_duration
        ),
        fleet_explosion_delay
    );

    if(ui.modals.leave_confirm.is_open())
        ui.modals.leave_confirm.close(delayed_open);
    else
        delayed_open();

    function delayed_open() {
        setTimeout(() => {
            // don't open if opponent left during fleet explosion animation
            if(ui.grids.$both.hasClass('dual-view'))
                ui.modals.game_over.open(opponent, battle_stats, victory);
        }, modal_delay);
    }
}

/**
 * Show how many ships the player sunk as the game message.
 * @private
 */
function display_sunk_ship_count() {
    const msg = 'Score: <strong>' +
                battle_stats.ships_sunk('player') + '/' +
                battle_stats.ships_total +
                '</strong> ships';
    ui.text.game_msg.set_text(msg);
}

/**
 * @typedef ShotData
 * @type {Object}
 * @property {!Boolean} hit - whether the shot is a hit
 * @property {!jQuery} $tile - Grid tile that has received the shot as a
 *                   [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 * @property {!String} grid - the grid that received the shot (can be either
 *                           'player' or 'opponent')
 * @property {Array} [sunken_ship_coords] - Coordinates of the ship, if it was
 *                                          sunk.
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
 * @property {!Boolean} is_hit - whether the shot is a hit
 * @property {!jQuery} $tile - Grid tile that has received the shot as a
 *                   [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
 * @property {Array} [sunken_ship_coords] - Coordinates of the ship, if it was
 *                                          sunk.
 * @property {!String} grid - the grid that received the shot (can be either
 *                           'player' or 'opponent')
 */
function mark_shot({hit: is_hit, $tile, sunken_ship_coords, grid}) {
    const marker_classes = is_hit ? 'fa fa-times' : 'fa fa-bullseye';
    let $marker;

    if(grid === 'player') {
        $marker = $('<i>').addClass(marker_classes);
        $tile.append($marker);
    } else { // marker element already present from shot indication
        $marker = $tile.children('i');
        $marker.addClass(marker_classes);
    }

    const marker_color = $marker.css('color');

    $marker.animate(
        { 'background-color': 'transparent' },
        {
            start: () => {
                $marker.css('background-color', marker_color);
                indicate_recent_shot($marker, marker_color, grid);

                if(sunken_ship_coords)
                    blow_ship_up(sunken_ship_coords, grid);
                else if(is_hit)
                    animate_explosion($tile);
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
    const $sprite_container = insert_sprite_container($tile);
    const offset = $sprite_container.outerWidth();
    const delay = 50;
    const num_sprites = 16;
    const spritesheet_row_length = 4;
    // total animation duration: num_sprites * delay = 800ms

    for(let i = 1; i < num_sprites; ++i) {
        /* jshint ignore:start */
        setTimeout(() => {
            $sprite_container.css(
                'background-position',
                -(i%spritesheet_row_length * offset) + 'px ' +
                -(Math.floor(i/spritesheet_row_length) * offset) + 'px'
            );
        }, i * delay);
        /* jshint ignore:end */
    }
    setTimeout(() => $sprite_container.remove(), num_sprites * delay);

    /* appends it to body and positions it globally */
    function insert_sprite_container($tile) {
        const tile_pos = $tile.offset();
        const em_size = parseFloat($('.game-grid').css('font-size'));
        const protrusion = 2 * em_size;

        return $('<div>')
            .addClass('sprite-container explosion')
            .appendTo('body')
            .offset({
                left: tile_pos.left - protrusion,
                top: tile_pos.top - protrusion
            })
            .outerWidth($tile.outerWidth() + 2*protrusion)
            .outerHeight($tile.outerHeight() + 2*protrusion);
    }
}

/**
 * Blow up a ship b/c it was sunk. If it was a ship of the opponent, also
 * reveal it.
 * @private
 *
 * @param {!Array} ship_coords - Coordinates of the ship.
 * @property {!String} grid_type - the grid that received the shot (can be
 *                                 either 'player' or 'opponent')
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
 * Animate destruction of entire fleet.
 * @private
 *
 * @param {!Grid} grid - [Grid]{@link module:classes/grid~Grid} to animate.
 * @param {!Number} duration - Duration of the animation in ms.
 */
function blow_fleet_up(grid, duration) {
    /* shake both grids if they are on top of each other to prevent the bottom
       grid from becoming visible when the top one shakes */
    const to_shake = adjacent_grid_mode() ? grid.table : ui.grids.$both;
    to_shake.effect('shake', {times: 8, distance: 10}, duration);

    grid.tiles.filter('.ship').each(function() {
        setTimeout(() =>
            animate_explosion($(this)),
            random_in_range(0, duration)
        );
    });
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
