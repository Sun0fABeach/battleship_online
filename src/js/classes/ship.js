/** Module containing the Ship class.
    @module classes/ship */

/** Ship class. */
export default class Ship {
    /**
     * Create a Ship instance.
     * @param {Array} coords - the ship's coordinates.
     */
    constructor(coords) {
        this._coords = coords;
        this._length = coords.length;
        this._alignment = this._calc_alignment();
    }

    get coords() {
        return this._coords;
    }

    get length() {
        return this._length;
    }

    get alignment() {
        return this._alignment;
    }

    get dimensions() {
        return this.alignment === 'x' ? [this.length, 1] : [1, this.length];
    }

    add_coords(coord_pair) {
        this.coords.push(coord_pair);
    }

    remove_coords(to_remove) {
        this.coords.forEach((coord_pair, index) => {
            if(this._equal_coords(coord_pair, to_remove)) {
                this.coords.splice(index, 1);
                return;
            }
        });
    }

    has_coords(searched) {
        return this.coords.some(
            coord_pair => this._equal_coords(coord_pair, searched)
        );
    }

    prepare_for_battle() {
        this._intact = Array.from(this.coords);
    }

    receive_shot(shot_coords) {
        let shot_hit = false;

        this._intact.forEach((coord_pair, index) => {
            if(this._equal_coords(shot_coords, coord_pair)) {
                this._intact.splice(index, 1);
                shot_hit = true;
                return;
            }
        });

        return {
            hit: shot_hit,
            sunken_ship: this._intact.length === 0 ? this.coords : null
        };
    }

    sort_coords() {
        const sort_key = this.alignment === 'x' ? 0 : 1;
        this.coords.sort((a, b) => a[sort_key] - b[sort_key]);
    }

    rotate(grid) {
        if(this.length === 1)
            return false;

        let rot_axis = Math.floor(this.length / 2);
        if(this.length % 2 === 0)
            --rot_axis;

        const [direction_modifier, new_alignment] =
                this.alignment === 'y' ? [1, 'x'] : [-1, 'y'];

        this._alignment = new_alignment;

        this.coords.forEach(function(pair, index) {
            const offset = index - rot_axis;
            pair[0] += offset * direction_modifier;
            pair[1] -= offset * direction_modifier;
        });

        // push back into grid, if necessary
        for(const dimension of [0, 1]) {
            // side: left or top
            let adjustment = this.coords[0][dimension];
            if(adjustment < 0) {
                for(const pair of this.coords)
                    pair[dimension] -= adjustment;
                break;
            }
            // side: bottom or right
            adjustment = this.coords[this.length-1][dimension] - grid.height + 1;
            if(adjustment > 0)
                for(const pair of this.coords)
                    pair[dimension] -= adjustment;
        }

        return true;
    }

    in_valid_state() {
        if(this.length === 1)
            return true;
        if(this.coords.length !== this.length)
            return false;

        const [same, different] = this.alignment === 'x' ? [1, 0] : [0 , 1];

        const constant = this.coords[0][same];
        if(this.coords.some(pair => pair[same] !== constant))
            return false;

        const diff_axis = this.coords.map(pair => pair[different]).sort();
        let prev_diff = diff_axis[0];
        for(let i = 1; i < this.length; ++i)
            if(diff_axis[i] !== ++prev_diff)
                return false;

        return true;
    }

    _calc_alignment() {
        if(this.length === 1)
            return 'x';
        return this.coords[0][0] === this.coords[1][0] ? 'y' : 'x';
    }

    _equal_coords(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
}
