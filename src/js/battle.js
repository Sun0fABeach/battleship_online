import Grid from './grid';
import Ship from './ship';

let player_ships;
let player_grid, opponent_grid;


export function init($player_table, $opponent_table) {
    player_grid = new Grid($player_table);
    opponent_grid = new Grid($opponent_table);
}

export function activate(ships) {
    player_ships = ships;

    for(const ship of player_ships) {
        ship.prepare_for_battle();
        player_grid.set_ship(ship);
        opponent_grid.set_ship(ship); // TODO: remove me later
    }
    opponent_grid.tiles.one('click', handle_player_shot);
    set_crosshair(true);
}

export function deactivate() {
    set_crosshair(false);

    player_grid
    .clear_ships()
    .tiles
    .children().remove();

    opponent_grid
    .clear_ships()
    .tiles
    .off()
    .removeClass('ship')
    .children().remove();
}

function handle_player_shot() {
    const $tile = $(this);
    const shot_result = send_shot(opponent_grid.tile_to_coords($tile));

    if(shot_result) {
        mark_hit($tile);
        if(shot_result instanceof Ship)
            reveal_ship(shot_result.coords);
    } else {
        mark_miss($tile);
    }
}

// fires at own ships atm, needs to fire at opponent via AJAX later ...
function send_shot(coords) {
    return receive_shot(coords);
}

function receive_shot(coord_pair) {
    const ship = opponent_grid.get_ship(coord_pair);
    if(!ship)
        return false;
    return ship.take_shot(coord_pair);
}

function mark_hit($tile) {
    $('<i class="fa fa-times"></i>').appendTo($tile);
}

function mark_miss($tile) {
    $('<i class="fa fa-bullseye"></i>').appendTo($tile);
}

function reveal_ship(ship_coords) {
    for(const coord_pair of ship_coords)
        opponent_grid.coords_to_tile(coord_pair).addClass('ship');
}

function set_crosshair(active) {
    opponent_grid.table.css('cursor', active ? 'crosshair' : '');
}
