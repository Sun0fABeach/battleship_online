import Ship from './classes/ship';

let socket;
let player_grid, opponent_grid;
let battle_active;


export function init(sock, plyr_grid, oppnt_grid) {
    battle_active = false;
    socket = sock;
    player_grid = plyr_grid;
    opponent_grid = oppnt_grid;
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

    player_grid
    .tiles
    .children().remove();

    opponent_grid
    .clear_ships()
    .tiles
    .removeClass('ship')
    .children().remove();

    opponent_grid.table.off('click');
}

function let_player_shoot() {
    set_crosshair(true);

    opponent_grid.table.one('click', 'td:not(:has(i))', function() {
        const $tile = $(this);
        set_crosshair(false);

        socket.emit(
            'shot',
            opponent_grid.tile_to_coords($tile),
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

    const $tile = player_grid.coords_to_tile(coord_pair);
    const ship = player_grid.get_ship($tile);

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
        opponent_grid.coords_to_tile(coord_pair).addClass('ship');
}

function set_crosshair(active) {
    opponent_grid.table.css('cursor', active ? 'crosshair' : '');
}
