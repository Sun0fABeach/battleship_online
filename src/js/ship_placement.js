/* TODO:
*   exact calculation of draggable size for styling?
*/

export function init() {
    $player_side = $('#player-side');
    $tiles = $player_side.find('td');
    $rows = $player_side.find('tr');
    coords_to_tile = {};
    drag_init_tile_count = 0;
    z_index_val = 0;

    init_droppables();  // must come first
    init_draggables();
    draw_grid();
}

export function deinit() {
    $player_side.find('.draggable').remove();
}

export function reinit() {
    z_index_val = 0;

    init_draggables();
    draw_grid();
}

export function is_valid() {
    return $tiles.filter('.over, .forbidden').length === 0;
}

const ships = [
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

let $player_side;
let $tiles;
let $rows;
let coords_to_tile;
let drag_init_tile_count;
let z_index_val;


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
        drag_init_tile_count = $(this).data('ship_length');
    }
};

function init_draggables() {
    drag_config.snapTolerance = Math.round($tiles.outerWidth() / 2) + 1;

    for(const ship_coords of ships) {
        const $draggable = $('<div></div>')
        .draggable(drag_config)
        .on('mousedown', draggable_mousedown_handler)
        .data('ship', ship_coords)
        .data('ship_length', ship_coords.length)
        .data('ship_alignment', calc_ship_alignment(ship_coords))
        .css('position', 'absolute')
        .insertAfter($player_side.find('table'));

        span_draggable_movable($draggable);
    }
}

function draggable_mousedown_handler() {
    const $draggable = $(this);

    // register rotation handler first
    $draggable.one('mouseup', function() {
        if(rotate_ship($draggable)) {
            draw_grid();
            span_draggable_movable($draggable);
        }
        clearTimeout(drag_start);
    });

    // after set amount of ms: don't rotate, but start dragging instead
    const drag_start = setTimeout(() => {
        $draggable.off('mouseup'); // remove rotation handler

        draw_grid($draggable.data('ship'));
        set_dragging_cursor(true);

        $('body').one('mouseup', function() {
            // coords might be mixed up due to over & out mechanics @ droppables
            sort_coords(
                $draggable.data('ship'), $draggable.data('ship_alignment')
            );
            // dropped ship needs to be on top of others
            $draggable.css('z-index', ++z_index_val);
            draw_grid();
            set_dragging_cursor(false);
        });
    }, 100);
}

function rotate_ship($draggable) {
    const [ship_coords, ship_len, ship_alignment] = get_ship_data($draggable);

    if(ship_len === 1)
        return false;

    let rot_axis = Math.floor(ship_len / 2);
    if(ship_len % 2 === 0)
        --rot_axis;

    const [direction_modifier, new_alignment] =
            ship_alignment === 'y' ? [1, 'x'] : [-1, 'y'];

    $draggable.data('ship_alignment', new_alignment);

    ship_coords.forEach(function(pair, index) {
        const offset = index - rot_axis;
        pair[0] += offset * direction_modifier;
        pair[1] -= offset * direction_modifier;
    });

    // push back into grid, if necessary
    for(const dimension of [0, 1]) {
        // side: left or top
        let adjustment = ship_coords[0][dimension];
        if(adjustment < 0) {
            for(const pair of ship_coords)
                pair[dimension] -= adjustment;
            break;
        }
        // side: bottom or right
        adjustment = ship_coords[ship_len-1][dimension] - $rows.length + 1;
        if(adjustment > 0)
            for(const pair of ship_coords)
                pair[dimension] -= adjustment;
    }

    return true;
}

// spans the draggable in a way that works for dragging movements
function span_draggable_movable($draggable) {
    const [ship_coords, ship_len, ship_alignment] = get_ship_data($draggable);
    const [cells_x, cells_y] = ship_dimensions(ship_len, ship_alignment);
    const $starting_tile = coords_to_tile[ship_coords[0]];

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
    const [ship_coords, ship_len, ship_alignment] = get_ship_data($draggable);

    const tiles = ship_coords.map((pair) => coords_to_tile[pair]);
    const tile_sizes = tiles.map(($tile) => {
        return [$tile.outerWidth(), $tile.outerHeight()];
    });
    const accumulate = ship_alignment === 'x' ? 0 : 1;
    let ship_area = tile_sizes.reduce((area, tile_size, index) => {
        area[accumulate] += tile_size[accumulate];
        return area;
    });
    ship_area[accumulate] += ship_coords.length - 1; // add gutter pixels

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
    const $elements = $player_side.find('.game-grid, .draggable');
    const drag_class = 'dragging';
    if(drag_happening)
        $elements.addClass(drag_class);
    else
        $elements.removeClass(drag_class);
}

function adjust_draggables() {
    $('.draggable').each(function(index, draggable) {
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
            const [ship_coords, ship_len, ship_alignment] = get_ship_data(
                ui.draggable
            );

            // avoid copy by reference here by using Array.from()
            ship_coords.push(Array.from($(this).data('coords')));

            if(ship_in_valid_state(ship_coords, ship_len, ship_alignment))
                draw_grid(ship_coords);
        }
    },
    out: function(event, ui) {
        const [ship_coords, ship_len, ship_alignment] = get_ship_data(
            ui.draggable
        );

        ship_coords.forEach((coord_pair, index, coords) => {
            if(equal_coords($(this).data('coords'), coord_pair)) {
                ship_coords.splice(index, 1);
                return;
            }
        });

        if(ship_in_valid_state(ship_coords, ship_len, ship_alignment))
            draw_grid(ship_coords);
    }
};

function init_droppables() {
    $rows.each(function(y, row) {
        $(row).find('td').each(function(x, tile) {
            const $tile = $(tile);
            $tile.droppable(drop_config);
            $tile.data('coords', [x, y]);
            coords_to_tile[[x, y]] = $tile;
        });
    });
}


function draw_grid(highlighted_ship) {
    clear_grid();
    draw_ships(highlighted_ship);
    mark_forbidden();
}

function clear_grid() {
    $tiles.removeClass('ship forbidden overlap highlighted');
}

function draw_ships(highlighted_ship) {
    for(const ship_coords of ships) {
        for(const $tile of ship_coords.map((coord) => coords_to_tile[coord])) {
            $tile.addClass($tile.hasClass('ship') ? 'overlap' : 'ship');
            if(ship_coords === highlighted_ship)
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
        for(const [ship_x, ship_y] of ship) {
            const surrounding_coords = surrounding_offsets.map(
                ([x_off, y_off]) => [ship_x + x_off, ship_y + y_off]
            );
            for(const adjacent of surrounding_coords) {
                if(ship.some((coords) => equal_coords(coords, adjacent)))
                    continue; // is part of this ship
                const $tile = coords_to_tile[adjacent];
                if(!$tile)
                    continue; // is outside grid
                if($tile.hasClass('ship') && !$tile.hasClass('overlap'))
                    $tile.addClass('forbidden');
            }
        }
    }
}

function get_ship_data($draggable) {
    return [
        $draggable.data('ship'),
        $draggable.data('ship_length'),
        $draggable.data('ship_alignment')
    ];
}

function calc_ship_alignment(ship_coords) {
    if(ship_coords.length === 1)
        return 'x';
    return ship_coords[0][0] === ship_coords[1][0] ? 'y' : 'x';
}

function ship_dimensions(length, alignment) {
    return alignment === 'x' ? [length, 1] : [1, length];
}

function sort_coords(ship_coords, alignment) {
    const sort_key = alignment === 'x' ? 0 : 1;
    ship_coords.sort((a, b) => a[sort_key] - b[sort_key]);
}

function equal_coords(a, b) {
    return a[0] === b[0] && a[1] === b[1];
}

function ship_in_valid_state(ship_coords, ship_len, ship_alignment) {
    if(ship_len === 1)
        return true;
    if(ship_coords.length !== ship_len)
        return false;

    const [same, different] = ship_alignment === 'x' ? [1, 0] : [0 , 1];

    const constant = ship_coords[0][same];
    if(ship_coords.some((pair) => pair[same] !== constant))
        return false;

    const diff_axis = ship_coords.map((pair) => pair[different]).sort();
    let prev_diff = diff_axis[0];
    for(let i = 1; i < ship_len; ++i)
        if(diff_axis[i] !== ++prev_diff)
            return false;

    return true;
}
