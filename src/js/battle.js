/**
 * Battle logic.
 * @module battle
 */

import Ship from './classes/ship';
import * as ui from './ui';
import { adjacent_grid_mode } from './helpers';


let battle_active;
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
 * @param {Opponent} opponent - interface for interacting with the
 *                              [opponent]{@link module:classes/opponent}
 * @param {Boolean} player_begins - whether the player takes the first shot.
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

function clear_opponent_grid() {
    ui.grids.opponent
    .tiles
    .removeClass('ship')
    .children().remove();

    ui.grids.opponent.table.off('click');
}

function clear_player_grid() {
    ui.grids.player
    .unregister_ships()
    .tiles
    .children().remove();
}

function set_grid_cursor(active, type) {
    ui.grids.opponent.table.css('cursor', active ? type : '');
}

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
        ship_to_reveal: shot_result.sunken_ship,
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

function let_opponent_shoot(opponent, first_shot=false) {
    highlight_actor('opponent');
    set_grid_cursor(true, 'not-allowed');

    opponent.let_shoot((coord_pair, inform_result_cb) =>
        handle_opponent_shot(opponent, coord_pair, inform_result_cb, first_shot)
    );
}

function handle_opponent_shot(
    opponent, coord_pair, inform_result_cb, first_shot
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

    inform_result_cb(shot_result);
}

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

function display_sunk_ship_count(first_shot) {
    let num_sunk = ship_count.total - ship_count.intact.opponent;
    const msg = 'Score: <strong>' +
                num_sunk + '/' + ship_count.total +
                '</strong> ships';
    ui.text.game_msg.set_text(msg);
}

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

function display_shot_mobile(shot_data) {
    if(shot_data.grid === 'player') {
        const mark_to = ui.grids.player.slid_up || pending_shots ? 200 : 0;
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
                if(shot_data.ship_to_reveal)
                    reveal_ship(shot_data.ship_to_reveal);
            },
            duration: 600
        }
    );
}

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

function set_shot_shadow($element, active, color) {
    if(active)
        $element.css('box-shadow', '0 0 0.6rem 0.2rem ' + color + ' inset');
    else
        $element.css('box-shadow', '');
}

function reveal_ship(ship_coords) {
    for(const coord_pair of ship_coords)
        ui.grids.opponent.coords_to_tile(coord_pair).addClass('ship');
}

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
