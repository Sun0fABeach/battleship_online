import Ship from './classes/ship';

/* TODO:
*   exact calculation of draggable size for styling?
*/

const ships_as_coords = [
    [[3, 5], [4, 5], [5, 5], [6, 5]],
    [[3, 1], [3, 2], [3, 3]],
    [[7, 9], [8, 9], [9, 9]],
    [[1, 8], [2, 8]],
    [[6, 1], [7, 1]],
    [[9, 5], [9, 6]],
    [[7, 3]],
    [[5, 7]],
    [[0, 4]],
    [[0, 0]],
];

let ships;
let player_grid;
let drag_init_tile_count;
let z_index_val;


export function init(plyr_grid) {
    player_grid = plyr_grid;
    player_grid.tiles.droppable(drop_config);
    ships = ships_as_coords.map(ship_coords => new Ship(ship_coords));
}

export function activate() {
    drag_init_tile_count = 0;
    z_index_val = 0;

    init_draggables();
    draw_grid();
}

export function deactivate() {
    ships.forEach(ship => ship.prepare_for_battle());
    player_grid.register_ships(ships);
    player_grid.table.siblings('.draggable').remove();
}

export function is_valid() {
    return player_grid.tiles.filter('.over, .forbidden').length === 0;
}


const drag_config = {
    containment: '#player-side table',
    snap: '#player-side td',
    snapMode: 'inner',
    snapTolerance: undefined,  // set this before applying!
    classes: {
        'ui-draggable': 'draggable',
        'ui-draggable-dragging': 'dragging'
    },
    start: function(event, ui) {
        drag_init_tile_count = $(this).data('ship').length;
    }
};

function init_draggables() {
    drag_config.snapTolerance = Math.round(
        player_grid.tiles.outerWidth() / 2
    ) + 1;

    for(const ship of ships) {
        const $draggable = $('<div>')
        .draggable(drag_config)
        .on('mousedown', draggable_mousedown_handler)
        .data('ship', ship)
        .css('position', 'absolute')
        .insertAfter(player_grid.table);

        span_draggable_movable($draggable);
    }
}

function draggable_mousedown_handler() {
    const $draggable = $(this);
    const ship = $draggable.data('ship');

    // register rotation handler first
    $draggable.one('mouseup', function() {
        if(ship.rotate(player_grid)) {
            draw_grid();
            span_draggable_movable($draggable);
        }
        clearTimeout(drag_start);
    });

    // after set amount of ms: don't rotate, but start dragging instead
    const drag_start = setTimeout(() => {
        $draggable.off('mouseup'); // remove rotation handler

        draw_grid(ship);
        set_dragging_cursor(true);

        $('body').one('mouseup', function() {
            // coords might be mixed up due to over & out mechanics @ droppables
            ship.sort_coords();
            // dropped ship needs to be on top of others
            $draggable.css('z-index', ++z_index_val);
            draw_grid();
            set_dragging_cursor(false);
        });
    }, 100);
}

// spans the draggable in a way that works for dragging movements
function span_draggable_movable($draggable) {
    const ship = $draggable.data('ship');
    const [cells_x, cells_y] = ship.dimensions;
    const $starting_tile = player_grid.coords_to_tile(ship.coords[0]);

    $draggable.css({
        top: $starting_tile.position().top,
        left: $starting_tile.position().left,
        width: ($starting_tile.outerWidth() - 1) * cells_x,
        height: ($starting_tile.outerHeight() - 1) * cells_y,
        zIndex: ++z_index_val
    });
}

// assumes that ship coords are sorted and inside grid!
// using this currently causes dragging issues, so atm, it is unused
function span_draggable_displayable($draggable) {
    const ship = $draggable.data('ship');

    const tiles = ship.coords.map(pair => player_grid.coords_to_tile(pair));
    const tile_sizes = tiles.map($tile => {
        return [$tile.outerWidth(), $tile.outerHeight()];
    });
    const accumulate = ship.alignment === 'x' ? 0 : 1;
    let ship_area = tile_sizes.reduce((area, tile_size, index) => {
        area[accumulate] += tile_size[accumulate];
        return area;
    });
    ship_area[accumulate] += ship.length - 1; // add gutter pixels

    $draggable.css({
        top: tiles[0].position().top,
        left: tiles[0].position().left,
        width: ship_area[0],
        height: ship_area[1],
        zIndex: ++z_index_val
    });
}

function set_dragging_cursor(drag_happening) {
    // set on multiple elements for consistent (uninterrupted) cursor change
    const $elements = player_grid.table.add(
        player_grid.table.siblings('.draggable')
    );
    const drag_class = 'dragging';
    if(drag_happening)
        $elements.addClass(drag_class);
    else
        $elements.removeClass(drag_class);
}

function adjust_draggables() {
    player_grid.table.siblings('.draggable').each(function(i, draggable) {
        span_draggable_movable($(draggable));
    });
}

let resize_debounce_timeout = 0;
let resize_registered = false;

$(window).resize(function() {
    if(resize_debounce_timeout) {
        resize_registered = true; // do resize when timeout fires
    } else {
        adjust_draggables();

        resize_debounce_timeout = setTimeout(() => {
            if(resize_registered) {
                adjust_draggables();
                resize_registered = false;
            }
            clearTimeout(resize_debounce_timeout);
            resize_debounce_timeout = 0;
        }, 100);
    }
});


const drop_config = {
    tolerance: 'touch',

    over: function(event, ui) {
        if(drag_init_tile_count-- <= 0) { // ignore initial drag events
            const ship = ui.draggable.data('ship');
            // avoid copy by reference here by using Array.from()
            ship.add_coords(Array.from($(this).data('coords')));
            if(ship.in_valid_state())
                draw_grid(ship);
        }
    },
    out: function(event, ui) {
        const ship = ui.draggable.data('ship');
        ship.remove_coords($(this).data('coords'));
        if(ship.in_valid_state())
            draw_grid(ship);
    }
};


function draw_grid(highlighted_ship) {
    clear_grid();
    draw_ships(highlighted_ship);
    mark_forbidden();
}

function clear_grid() {
    player_grid.tiles.removeClass('ship forbidden overlap highlighted');
}

function draw_ships(highlighted_ship) {
    for(const ship of ships) {
        const tiles = ship.coords.map(
            coords => player_grid.coords_to_tile(coords)
        );
        for(const $tile of tiles) {
            $tile.addClass($tile.hasClass('ship') ? 'overlap' : 'ship');
            if(ship === highlighted_ship)
                $tile.addClass('highlighted');
        }
    }
}

const surrounding_offsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
];
function mark_forbidden() {
    for(const ship of ships) {
        for(const [ship_x, ship_y] of ship.coords) {
            const surrounding_coords = surrounding_offsets.map(
                ([x_off, y_off]) => [ship_x + x_off, ship_y + y_off]
            );
            for(const adjacent of surrounding_coords) {
                if(ship.has_coords(adjacent))
                    continue; // is part of this ship
                const $tile = player_grid.coords_to_tile(adjacent);
                if(!$tile)
                    continue; // is outside grid
                if($tile.hasClass('ship') && !$tile.hasClass('overlap'))
                    $tile.addClass('forbidden');
            }
        }
    }
}
