import Ship from './classes/ship';
import { grids } from './ui';

let socket;
let battle_active;


export function init(sock) {
    battle_active = false;
    socket = sock;
}

export function activate(player_begins) {
    battle_active = true;
    if(player_begins)
        let_player_shoot();
    else
        let_opponent_shoot();
}

export function deactivate() {
    battle_active = false;
    set_crosshair(false);

    grids.opponent
    .tiles
    .removeClass('ship')
    .children().remove();

    grids.opponent.table.off('click');

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
        mark_hit($tile);
        if(shot_result instanceof Array)
            reveal_ship(shot_result);
    } else {
        mark_miss($tile);
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
        mark_hit($tile);
    } else {
        inform_result_cb(false);
        mark_miss($tile);
    }

    let_player_shoot();
}

function mark_hit($tile) {
    $('<i>').addClass('fa fa-times').appendTo($tile);
}

function mark_miss($tile) {
    $('<i>').addClass('fa fa-bullseye').appendTo($tile);
}

function reveal_ship(ship_coords) {
    for(const coord_pair of ship_coords)
        grids.opponent.coords_to_tile(coord_pair).addClass('ship');
}

function set_crosshair(active) {
    grids.opponent.table.css('cursor', active ? 'crosshair' : '');
}
