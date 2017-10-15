export class Grid {
    constructor($container) {
        this._$table_wrapper = $container.find('.game-grid');
        this._$table = this._$table_wrapper.find('table');
        this._$tiles = this._$table.find('td');
        const $rows = this._$table.find('tr');
        this._width = $rows.eq(0).find('td').length;
        this._height = $rows.length;
        this._coords_tile_mapping = this._init_mapping($rows);
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

    coords_to_tile(coord_pair) {
        return this._coords_tile_mapping[coord_pair];
    }

    tile_to_coords($tile) {
        return $tile.data('coords');
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

export class OwnGrid extends Grid {
    constructor($table) {
        super($table);
        this._ships = [];
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

    slideToggle(callback) {
        this._$table_wrapper.slideToggle(callback);
    }

    slideUp(callback) {
        this._$table_wrapper.slideUp(callback);
    }

    slideDown(callback) {
        this._$table_wrapper.slideDown(callback);
    }
}
