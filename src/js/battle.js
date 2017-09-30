import Ship from './ship';
import Grid from './grid';

let player_ships;
let opponent_grid;


export function init($opponent_table) {
    opponent_grid = new Grid($opponent_table);
}

export function activate(placed_ships) {
    player_ships = init_ships(placed_ships);
    opponent_grid.tiles.one('click', handle_player_shot);
    set_crosshair(true);
}

export function deactivate() {
    set_crosshair(false);

    opponent_grid
    .clear_ships()
    .tiles
    .off()
    .removeClass('ship')
    .children().remove();
}

function init_ships(placed_ships) {
    const ships = [];
    for(const ship_coords of placed_ships) {
        const ship = new Ship(ship_coords);
        ships.push(ship);
        for(const coord_pair of ship_coords)
            opponent_grid.set_ship(ship, coord_pair);
    }
    return ships;
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
