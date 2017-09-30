import Ship from './ship';

let coords_to_tile = {};
let player_ships;
let $target_grid;


export function init($opponent_grid) {
    $target_grid = $opponent_grid;
    init_tiles();
}

export function activate(placed_ships) {
    player_ships = init_ships(placed_ships);
    $target_grid.find('td').one('click', handle_player_shot);
    set_crosshair(true);
}

export function deactivate() {
    set_crosshair(false);
    $target_grid.find('td')
    .off()
    .removeClass('ship')
    .children().remove();
}

function init_tiles() {
    $target_grid.find('tr').each(function(y, row) {
        $(row).find('td').each(function(x, tile) {
            const $tile = $(tile);
            $tile.data('coords', [x, y]);
            coords_to_tile[[x, y]] = $tile;
        });
    });
}

function init_ships(placed_ships) {
    const ships = [];
    for(const ship_coords of placed_ships) {
        const ship = new Ship(ship_coords);
        ships.push(ship);
        for(const coord_pair of ship_coords)
            coords_to_tile[coord_pair].data('ship', ship);
    }
    return ships;
}

function handle_player_shot() {
    const $tile = $(this);
    const shot_result = send_shot($tile.data('coords'));

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
    const ship = coords_to_tile[coord_pair].data('ship');
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
        coords_to_tile[coord_pair].addClass('ship');
}

function set_crosshair(active) {
    $target_grid.css('cursor', active ? 'crosshair' : '');
}
