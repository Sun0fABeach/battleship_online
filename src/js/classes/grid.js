/** Module containing grid class definitions.
    @module classes/grid
*/

/** Class representing a DOM game grid. */
class Grid {
    /**
     * Create a Grid instance.
     * @param {jQuery} $container -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  DOM element containing the grid.
     */
    constructor($container) {
        this._$table_wrapper = $container.find('.game-grid');
        this._$table = this._$table_wrapper.find('table');
        this._$tiles = this._$table.find('td');
        const $rows = this._$table.find('tr');
        this._width = $rows.eq(0).find('td').length;
        this._height = $rows.length;
        this._coords_tile_mapping = this._init_mapping($rows);
        this._highlight_state = false;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get tiles() {
        return this._$tiles;
    }

    get table() {
        return this._$table;
    }

    set highlight_state(new_state) {
        this._highlight_state = new_state;
    }

    highlight_from_state() {
        this.highlight(this._highlight_state, false);
    }

    highlight(active, stateful=true) {
        this.table.css('box-shadow', active ? '0 0 0.8rem 0.4rem grey' : '');
        if(stateful)
            this.highlight_state = active;
    }

    coords_to_tile(coord_pair) {
        return this._coords_tile_mapping[coord_pair];
    }

    tile_to_coords($tile) {
        return $tile.data('coords');
    }

    coords_map() {
        const map = [];
        for(let y = 0; y < this.height; ++y) {
            const row = [];
            for(let x = 0; x < this.width; ++x)
                row.push([x, y]);
            map.push(row);
        }
        return map;
    }

    /**
     * For each coordinate surrounding the given coordinate, perform an action.
     *
     * @param {Number} x - x coordinate.
     * @param {Number} y - y coordinate.
     * @param {Array} adjacent_offsets - list of coordinate pairs determining
     *                for which of the adjacent coordinates the action should
     *                be performed.
     * @param {Function} action - Callback to call for each surrounding
     *                            coordinate.
     */
    surrounding_coords_do(x, y, adjacent_offsets, action) {
        const adjacent_coords = adjacent_offsets.map(
            ([x_off, y_off]) => [x + x_off, y + y_off]
        );
        for(const coord_pair of adjacent_coords) {
            const $tile = this.coords_to_tile(coord_pair);
            if($tile) // exclude off-grid coords
                action(coord_pair, $tile);
        }
    }

    _init_mapping($rows) {
        const mapping = {};

        $rows.each(function(y, row) {
            $(row).find('td').each(function(x, tile) {
                const $tile = $(tile);
                $tile.data('coords', [x, y]);
                mapping[[x, y]] = $tile;
            });
        });

        return mapping;
    }
}

/** Class representing the players DOM game grid, containing his fleet. */
class OwnGrid extends Grid {
    /**
     * Create a OwnGrid instance.
     * @param {jQuery} $container -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  DOM element containing the grid.
     */
    constructor($container) {
        super($container);
        this._ships = [];
        this._slid_up = false; // state saved to handle window resizing
        this._sliding = false;
    }

    get sliding() {
        return this._sliding;
    }

    get slid_up() {
        return this._slid_up;
    }

    set slid_up(is_slid_up) {
        this._slid_up = is_slid_up;
    }

    get num_ships() {
        return this._ships.length;
    }

    register_ships(ships) {
        this._ships = ships;

        for(const ship of ships)
            for(const coord_pair of ship.coords)
                this.coords_to_tile(coord_pair).data('ship', ship);
    }

    get_ship(target) {
        if(target instanceof Array)
            return this.coords_to_tile(target).data('ship');
        else
            return target.data('ship');
    }

    unregister_ships() {
        this._ships = [];
        this.tiles.removeData('ship');
        return this;
    }

    show(visible, stateful=true) {
        if(visible)
            this._$table_wrapper.show();
        else
            this._$table_wrapper.hide();

        if(stateful)
            this._slid_up = !visible;
    }

    show_from_state() {
        this.show(!this._slid_up, false);
    }

    slideToggle(callback) {
        this._sliding = true;
        this._slid_up = !this._slid_up;

        this._$table_wrapper.slideToggle(() => {
            this._sliding = false;
            if(callback)
                callback();
        });
    }

    slideUp(callback) {
        this._sliding = true;
        this._slid_up = true;

        this._$table_wrapper.slideUp(() => {
            this._sliding = false;
            if(callback)
                callback();
        });
    }

    slideDown(callback) {
        this._sliding = true;
        this._slid_up = false;

        this._$table_wrapper.slideDown(() => {
            this._sliding = false;
            if(callback)
                callback();
        });
    }
}


export { Grid, OwnGrid };
