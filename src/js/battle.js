let i = 0;
let coords_to_tile = {};
let player_ships;
let $target_grid;

export function init($opponent_grid, placed_ships) {
    player_ships = placed_ships;
    $target_grid = $opponent_grid;

    set_crosshair(true);
    init_tiles();
}

export function deinit() {
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

            $tile.one('click', function(event) {
                event.preventDefault();
                if(i % 3 == 0) {
                    mark_hit($(this));
                } else if(i % 3 == 1) {
                    mark_miss($(this));
                } else {
                    reveal_ship($(this));
                }
                ++i;
            });
        });
    });
}

function set_crosshair(active) {
    $target_grid.css('cursor', active ? 'crosshair' : '');
}

function mark_hit($tile) {
    $('<i class="fa fa-times"></i>').appendTo($tile);
}

function mark_miss($tile) {
    $('<i class="fa fa-bullseye"></i>').appendTo($tile);
}

function reveal_ship($tile) {
    $tile.addClass('ship');
}
