import Ship from './classes/ship';
import { grids } from './ui';
import { adjacent_grid_mode } from './helpers';

let socket;
let battle_active;


export function init(sock) {
    battle_active = false;
    socket = sock;
}

export function activate(player_begins) {
    battle_active = true;
    if(player_begins) {
        if(adjacent_grid_mode())            // set without actually sliding up
            grids.player.slid_up = true;    // for state consistency
        else
            grids.player.slideUp();
        let_player_shoot();
    } else {
        let_opponent_shoot();
    }
}

export function deactivate() {
    battle_active = false;
    set_crosshair(false);

    clear_opponent_grid();
    clear_player_grid();
}

function clear_opponent_grid() {
    grids.opponent
    .tiles
    .removeClass('ship')
    .children().remove();

    grids.opponent.table.off('click');
}

function clear_player_grid() {
    grids.player
    .unregister_ships()
    .tiles
    .children().remove();
}

function let_player_shoot() {
    set_crosshair(true);

    grids.opponent.table.one('click', 'td:not(:has(i))', function() {
        const $tile = $(this);
        set_crosshair(false);

        socket.emit(
            'shot',
            grids.opponent.tile_to_coords($tile),
            (shot_result) => handle_player_shot_result(shot_result, $tile)
        );
    });
}

function handle_player_shot_result(shot_result, $tile) {
    if(!battle_active) // battle might have been aborted before result arrives
        return;

    if(shot_result) {
        display_hit($tile);
        if(shot_result instanceof Array)
            reveal_ship(shot_result);
    } else {
        display_miss($tile);
    }

    let_opponent_shoot();
}

function let_opponent_shoot() {
    socket.once('shot', handle_opponent_shot);
}

function handle_opponent_shot(coord_pair, inform_result_cb) {
    if(!battle_active) // might have been aborted before shot arrived
        return;

    const $tile = grids.player.coords_to_tile(coord_pair);
    const ship = grids.player.get_ship($tile);

    if(ship) {
        inform_result_cb(ship.receive_shot(coord_pair));
        display_hit($tile, true);
    } else {
        inform_result_cb(false);
        display_miss($tile, true);
    }

    let_player_shoot();
}

function display_hit($tile, on_player=false) {
    display_shot($tile, 'fa fa-times', on_player);
}

function display_miss($tile, on_player=false) {
    display_shot($tile, 'fa fa-bullseye', on_player);
}

function display_shot($tile, marker_classes, on_player) {
    if(adjacent_grid_mode()) {
        mark_shot($tile, marker_classes);
    } else {
        if(on_player) {
            grids.player.slideDown(() => {
                setTimeout(() => {
                    mark_shot($tile, marker_classes);
                    setTimeout(() => {
                        grids.player.slideUp();
                    }, 700);
                }, 200);
            });
        } else {
            grids.player.slideUp(() => {
                setTimeout(() => {
                    mark_shot($tile, marker_classes);
                }, 200);
            });
        }
    }
}

function mark_shot($tile, marker_classes) {
    $('<i>').addClass(marker_classes).appendTo($tile);
}

function reveal_ship(ship_coords) {
    for(const coord_pair of ship_coords)
        grids.opponent.coords_to_tile(coord_pair).addClass('ship');
}

function set_crosshair(active) {
    grids.opponent.table.css('cursor', active ? 'crosshair' : '');
}
