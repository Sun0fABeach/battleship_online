/**
 * Ship placement logic, using jQuery UI
 * [drag]{@link https://api.jqueryui.com/draggable/} &
 * [drop]{@link https://api.jqueryui.com/droppable/}
 * @module classes/ship_placement
 */

import Ship from './ship';
import { grids } from '../ui';
import { chance_in_percent, array_choice } from '../helpers';

// TODO: exact calculation of draggable size for styling?

/** Fleet configuration as array of ship sizes */
// const fleet_config = [2]; // for debugging
const fleet_config = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
fleet_config.sort().reverse(); // just in case config not sorted in desc order

/** Coordinate offsets usable to determine surrounding tiles. */
const surrounding_offsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
];

/** Basic ship placement class. Able to set random coordinates. */
class ShipPlacement {
    /**
     * Create a ShipPlacement instance.
     */
    constructor() {
        const ships_as_coords = fleet_config.reduce((result, ship_size) => {
            const coords = [];
            for(let i = 0; i < ship_size; ++i)
                coords.push([i, 0]);
            result.push(coords);
            return result;
        }, []);

        this._set_random_ship_coords(ships_as_coords);
        this._ships = ships_as_coords.map(ship_coords => new Ship(ship_coords));
    }

    /**
     * List of all placed [ships]{@link module:classes/ship~Ship}.
     */
    get ships() {
        return this._ships;
    }

    /**
     * Calculate random ship placement coordinates.
     *
     * @param {Array} coords_of_ships - Coordinates of each ship. They are
     *                                  randomized in place.
     */
    _set_random_ship_coords(coords_of_ships) {
        const coords_map = grids.player.coords_map();

        for(const ship_coords of coords_of_ships) {
            const alignment = chance_in_percent(50) ? 'hor' : 'vert';
            ship_coords[0] = array_choice(
                this._get_placement_choices(
                    coords_map, ship_coords.length, alignment
                )
            );

            if(ship_coords.length > 1) {
                const [stable_axis, incr_axis] = alignment === 'hor' ? [1, 0] :
                                                                       [0, 1];
                const stable_coord = ship_coords[0][stable_axis];
                let incr_coord = ship_coords[0][incr_axis];
                for(let i = 1; i < ship_coords.length; ++i) {
                    ship_coords[i][stable_axis] = stable_coord;
                    ship_coords[i][incr_axis] = ++incr_coord;
                }
            }

            for(const [ship_x, ship_y] of ship_coords) {
                coords_map[ship_y][ship_x] = null;
                /* jshint ignore:start */
                grids.player.surrounding_coords_do(
                    ship_x, ship_y, surrounding_offsets,
                    (coord_pair, $tile) => {
                        coords_map[coord_pair[1]][coord_pair[0]] = null;
                    }
                );
                /* jshint ignore:end */
            }

            // let print_map = '';
            // for(const row of coords_map) {
            //     row.forEach(coord_pair => print_map += coord_pair ? '0' : '1');
            //     print_map += '\n';
            // }
            // console.log(print_map);
        }
    }

    /**
     * Acquire all possible coordinate pairs that are placement options for the
     * given ship. A placement option is supposed to be the first coordinate of
     * the ship (leftmost for horizontal, topmost for vertical alignment).
     *
     * @param {Array} coords_map - 2D map containing the grid's coordinates.
     * @param {Array} ship_length - Length of ship to be placed.
     * @param {String} alignment - Alignment of ship (either 'hor' or 'vert').
     * @returns {Array} Possible placement coordinates.
     */
    _get_placement_choices(coords_map, ship_length, alignment) {
        if(ship_length > 1) {
            const slices = this._slice_map(coords_map, alignment).filter(
                slice => slice.length >= ship_length
            );
            slices.forEach(slice => slice.splice(-(ship_length-1)));
            return slices.reduce((result, slice) => result.concat(slice), []);
        } else {
            return coords_map.reduce((result, row) => result.concat(row), [])
                             .filter(coord_pair => coord_pair !== null);
        }
    }

    /**
     * Acquire horizontal or vertical slices of the map that can be used to
     * determine the placement options for a ship. Slices are delimited by the
     * map borders and coordinates set to *null*.
     *
     * @param {Array} coords_map - 2D map containing the grid's coordinates.
     * @param {String} alignment - Alignment of ship (either 'hor' or 'vert').
     *                             This determines the axis of the slices.
     * @return {Array} 2D array containing the coordinate slices.
     */
    _slice_map(coords_map, alignment) {
        const access_map = alignment === 'hor' ?
            (lane_i, slice_i) => coords_map[lane_i][slice_i] :
            (lane_i, slice_i) => coords_map[slice_i][lane_i];

        const slices = [];
        for(let lane_i = 0; lane_i < coords_map.length; ++lane_i) {
            let slice_i;
            // move to first none-null position in the slice
            for(slice_i = 0; slice_i < coords_map.length; ++slice_i)
                if(access_map(lane_i, slice_i) !== null)
                    break;
            // extract slice sections
            let section = [];
            for( ; slice_i < coords_map.length; ++slice_i) {
                const coord_pair = access_map(lane_i, slice_i);
                if(coord_pair !== null) {
                    section.push(coord_pair);
                } else if(section.length > 0) {
                    slices.push(section);
                    section = [];
                }
            }
            if(section.length > 0)
                slices.push(section);
        }
        return slices;
    }
}


/** Ship placement class that enables drag & drop on the player grid. */
class DnDShipPlacement extends ShipPlacement {
    /**
     * Create a DnDShipPlacement instance.
     */
    constructor() {
        if(DnDShipPlacement.instance) // singleton pattern
            return DnDShipPlacement.instance;

        super();

        DnDShipPlacement.instance = this;

        /** Whether ship placement is active
            @private */
        this._placement_active = false;
        /** Used for dragging logic, initialized w/ ship length on drag start
            @private */
        this._drag_init_tile_count = 0;
        /** CSS z-index value for draggables
            @private */
        this._z_index_val = 0;

        const that = this;

        this._drag_config = {
            containment: '#player-side table',
            snap: '#player-side td',
            snapMode: 'inner',
            snapTolerance: undefined,  // set this before applying!
            classes: {
                'ui-draggable': 'draggable',
                'ui-draggable-dragging': 'dragging'
            },
            start: function(event, ui) {
                that._drag_init_tile_count = $(this).data('ship').length;
            }
        };

        const drop_config = {
            tolerance: 'touch',

            over: function(event, ui) {
                // ignore initial drag events
                if(that._drag_init_tile_count-- <= 0) {
                    const ship = ui.draggable.data('ship');
                    // avoid copy by reference here by using Array.from()
                    ship.add_coords(Array.from($(this).data('coords')));
                    if(ship.in_valid_state())
                        that._draw_grid(ship);
                }
            },
            out: function(event, ui) {
                const ship = ui.draggable.data('ship');
                ship.remove_coords($(this).data('coords'));
                if(ship.in_valid_state())
                    that._draw_grid(ship);
            }
        };

        grids.player.tiles.droppable(drop_config);

        let resize_debounce_timeout = 0;
        let resize_registered = false;

        /* note that this resize handler won't be registered more than once due
           to the singleton pattern */
        $(window).resize(function() {
            if(resize_debounce_timeout) {
                resize_registered = true; // do resize when timeout fires
            } else {
                that._adjust_draggables();

                resize_debounce_timeout = setTimeout(() => {
                    if(resize_registered) {
                        that._adjust_draggables();
                        resize_registered = false;
                    }
                    clearTimeout(resize_debounce_timeout);
                    resize_debounce_timeout = 0;
                }, 100);
            }
        });
    }

    /**
     * Activate drag & drop ship placement. Call before using any other object
     * methods!
     */
    activate() {
        if(this.is_active())
            return;

        this._placement_active = true;
        this._drag_init_tile_count = 0;
        this._z_index_val = 0;

        this._init_draggables();
        this._draw_grid();
    }

    /**
     * Deactivate ship placement. This will remove all draggables and register
     * the placed [ships]{@link module:classes/ship~Ship} with the grid.
     */
    deactivate() {
        if(!this.is_active())
            return;

        this._ships.forEach(ship => ship.prepare_for_battle());
        /* by registering the placed ships with the grid, other modules can
         * obtain them via the grid object */
        grids.player.register_ships(this._ships);
        grids.player.table.siblings('.draggable').remove();
        this._placement_active = false;
    }

    /**
     * Returns whether ship placement is active.
     *
     * @returns {Boolean} true if ship placmement is active, false otherwise
     * @see #activate
     * @see #deactivate
     */
    is_active() {
        return this._placement_active;
    }

    /**
     * Returns whether the current ship placment is valid.
     *
     * @returns {Boolean} true if ship placement is valid, false otherwise
     */
    is_valid() {
        return grids.player.tiles.filter('.over, .forbidden').length === 0;
    }

    /**
     * Calculate random ship placement and place ships in new configuration.
     */
    randomize() {
        const coords_of_ships = this._ships.map(ship => ship.coords);
        this._set_random_ship_coords(coords_of_ships);
        this._ships.forEach((ship, idx) => {
            ship.coords = coords_of_ships[idx];
        });
        this._adjust_draggables();
        this._draw_grid();
    }

    /**
     * Create draggable DOM elements and place them on the player's grid.
     */
    _init_draggables() {
        this._drag_config.snapTolerance = Math.round(
            grids.player.tiles.outerWidth() / 2
        ) + 1;

        for(const ship of this._ships) {
            const $draggable = $('<div>')
            .draggable(this._drag_config)
            .on('mousedown', _draggable_mousedown_handler)
            .data('ship', ship)
            .css('position', 'absolute')
            .insertAfter(grids.player.table);

            this._span_draggable_movable($draggable);
        }

        const that = this;

        /**
         * Event handler for mouse interaction with draggables.
         */
        function _draggable_mousedown_handler() {
            const $draggable = $(this); // jshint ignore:line
            const ship = $draggable.data('ship');

            // register rotation handler first
            $draggable.one('mouseup', function() {
                if(ship.rotate(grids.player.height)) {
                    that._draw_grid();
                    that._span_draggable_movable($draggable);
                }
                clearTimeout(drag_start);
            });

            // after set amount of ms: don't rotate, but start dragging instead
            const drag_start = setTimeout(() => {
                $draggable.off('mouseup'); // remove rotation handler

                that._draw_grid(ship);
                _set_dragging_cursor(true);

                $('body').one('mouseup', function() {
                    /* coords might be mixed up due to over & out
                       mechanics @ droppables */
                    ship.sort_coords();
                    // dropped ship needs to be on top of others
                    $draggable.css('z-index', ++that._z_index_val);
                    that._draw_grid();
                    _set_dragging_cursor(false);
                });
            }, 65);
        }

        /**
         * Enable/disable dragging cursor.
         *
         * @param {Boolean} drag_happening - True if cursor shall take dragging
         *                                   form, false for normal form
         */
        function _set_dragging_cursor(drag_happening) {
            // set on multiple elements for uninterrupted cursor change
            const $elements = grids.player.table.add(
                grids.player.table.siblings('.draggable')
            );
            const drag_class = 'dragging';
            if(drag_happening)
                $elements.addClass(drag_class);
            else
                $elements.removeClass(drag_class);
        }
    }


    /**
     * Span draggable DOM element to make drag & drop work.
     *
     * @param {jQuery} $draggable - draggable
     *        [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
     */
    _span_draggable_movable($draggable) {
        const ship = $draggable.data('ship');
        const [cells_x, cells_y] = ship.dimensions;
        const $starting_tile = grids.player.coords_to_tile(ship.coords[0]);

        $draggable.css({
            top: $starting_tile.position().top,
            left: $starting_tile.position().left,
            width: ($starting_tile.outerWidth() - 1) * cells_x,
            height: ($starting_tile.outerHeight() - 1) * cells_y,
            zIndex: ++this._z_index_val
        });
    }

    /**
     * Span draggable DOM element to make it work with drag & drop and also
     * cover the occupied grid cells for displaying it properly. NOTE: this
     * function currently causes dragging glitches, so it has to be fixed
     * before using it.
     *
     * @param {jQuery} $draggable - draggable
     *        [jQuery]{@link http://api.jquery.com/Types/#jQuery} object
     */
    _span_draggable_displayable($draggable) {
        const ship = $draggable.data('ship');

        const tiles = ship.coords.map(
            pair => grids.player.coords_to_tile(pair)
        );
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

    /**
     * (Re)draw all draggables.
     */
    _adjust_draggables() {
        const that = this;
        grids.player.table.siblings('.draggable').each(function(i, draggable) {
            that._span_draggable_movable($(draggable));
        });
    }

    /**
     * Clear all ships and placement markers from the player's grid, then
     * (re)draw them.
     *
     * @param {Ship} highlighted_ship - [ship]{@link module:classes/ship~Ship}
     *                                  that is currently being dragged
     */
    _draw_grid(highlighted_ship) {
        this._clear_grid();
        this._draw_ships(highlighted_ship);
        this._mark_forbidden();
    }

    /**
     * Clear all ships and placement markers from the player's grid.
     */
    _clear_grid() {
        grids.player.tiles.removeClass('ship forbidden overlap highlighted');
    }

    /**
     * Draw all ships on the player's grid.
     *
     * @param {Ship} highlighted_ship - [ship]{@link module:classes/ship~Ship}
     *                                  that is currently being dragged
     */
    _draw_ships(highlighted_ship) {
        for(const ship of this._ships) {
            /* jshint ignore:start */
            const tiles = ship.coords.map(
                coords => grids.player.coords_to_tile(coords)
            );
            /* jshint ignore:end */
            for(const $tile of tiles) {
                $tile.addClass($tile.hasClass('ship') ? 'overlap' : 'ship');
                if(ship === highlighted_ship)
                    $tile.addClass('highlighted');
            }
        }
    }

    /**
     * Add markers for invalid ship placements to the player's grid.
     */
    _mark_forbidden() {
        for(const ship of this._ships) {
            for(const [ship_x, ship_y] of ship.coords) {
                /* jshint ignore:start */
                grids.player.surrounding_coords_do(
                    ship_x, ship_y, surrounding_offsets,
                    (coord_pair, $tile) => {
                        if(ship.has_coords(coord_pair))
                            return;
                        if($tile.hasClass('ship') && !$tile.hasClass('overlap'))
                            $tile.addClass('forbidden');
                    }
                );
                /* jshint ignore:end */
            }
        }
    }
}


export { ShipPlacement, DnDShipPlacement };
