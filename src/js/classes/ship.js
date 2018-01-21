/** Module containing the Ship class.
    @module classes/ship */

import { equal_coords } from '../helpers';

/** Ship class. */
class Ship {
    /**
     * Create a Ship instance.
     *
     * @param {!Array} coords - the ship's coordinates (array of size-2 arrays).
     *      Note that the array is copied by reference, so any outside
     *      modification to it will cause inconsistencies within this object!
     */
    constructor(coords) {
        this.coords = coords;
    }

    /**
     * The coordinates of the ship. If set, the
     * [length]{@link module:classes/ship~Ship#length} and
     * [alignment]{@link module:classes/ship~Ship#alignment}
     * properties will be adjusted accordingly.
     *
     * @type {Array}
     */
    set coords(new_coords) {
        this._coords = new_coords;
        this._length = new_coords.length;
        this._alignment = this._calc_alignment();
    }

    get coords() {
        return this._coords;
    }

    /**
     * The length of the ship (number of coordinates it occupies).
     * @readonly
     *
     * @type {Number}
     */
    get length() {
        return this._length;
    }

    /**
     * The alignment of the ship. Can only be either 'x' or 'y'.
     * @readonly
     *
     * @type {String}
     */
    get alignment() {
        return this._alignment;
    }

    /**
     * The dimensions of the ship in terms of horizontal and vertical length.
     * For horizontal alignment, [length, 1] is returned. For vertical
     * alignment, [1, length] is returned.
     * @readonly
     *
     * @type {Array}
     */
    get dimensions() {
        return this.alignment === 'x' ? [this.length, 1] : [1, this.length];
    }

    /**
     * Add a coordinate pair to the ship's coordinates. Note that this will not
     * adjust the [length]{@link module:classes/ship~Ship#length} and
     * [alignment]{@link module:classes/ship~Ship#alignment} properties, because
     * it is supposed to be an addition done while the ship is being dragged,
     * moving to a new tile. During this drag, length and alignment don't
     * change.
     *
     * @param {!Array} - Coordinate pair to add.
     */
    add_coords(coord_pair) {
        this.coords.push(coord_pair);
    }

    /**
     * Remove a coordinate pair from the ship's coordinates. Note that this
     * will not adjust the [length]{@link module:classes/ship~Ship#length} and
     * [alignment]{@link module:classes/ship~Ship#alignment} properties, because
     * it is supposed to be a removal done while the ship is being dragged and
     * leaving a tile. During this drag, length and alignment don't change.
     *
     * @param {!Array} - Coordinate pair to remove.
     */
    remove_coords(to_remove) {
        this.coords.forEach((coord_pair, index) => {
            if(equal_coords(coord_pair, to_remove)) {
                this.coords.splice(index, 1);
                return;
            }
        });
    }

    /**
     * Return whether the ship's coordinates contain the given coordinate pair.
     *
     * @param {!Array} - Coordinate pair to search.
     * @returns {Boolean} Whether matching coordinates are found.
     */
    has_coords(searched) {
        return this.coords.some(
            coord_pair => equal_coords(coord_pair, searched)
        );
    }

    /**
     * Has to be called once before a
     * [receive_shot]{@link module:classes/ship~Ship#receive_shot} can be
     * successfully called.
     */
    prepare_for_battle() {
        this._intact = Array.from(this.coords);
    }

    /**
     * @typedef ShotResult
     * @type {Object}
     * @property {Boolean} hit - whether the shot is a hit.
     * @property {Array} [sunken_ship] - Coordinates of the ship. Only set if
     *                                   the ship has been sunk by the shot.
     */

    /**
     * Receive a shot and return the result.
     *
     * @param {!Array} - Coordinate pair of the shot.
     * @returns {ShotResult} the result of the shot.
     */
    receive_shot(shot_coords) {
        let shot_hit = false;

        this._intact.find((coord_pair, index) => {
            if(equal_coords(shot_coords, coord_pair)) {
                this._intact.splice(index, 1);
                shot_hit = true;
                return true;
            }
            return false;
        });

        return {
            hit: shot_hit,
            sunken_ship: this._intact.length === 0 ? this.coords : null
        };
    }

    /**
     * Sort the ship's coordinates so they are arranged left-to-right in
     * case of horizontal alignment, or top-to-bottom if the ship is aligned
     * vertically. This may be necessary after coordinate pairs have been
     * [added]{@link module:classes/ship~Ship#add_coords} or
     * [removed]{@link module:classes/ship~Ship#remove_coords} during dragging.
     */
    sort_coords() {
        const sort_key = this.alignment === 'x' ? 0 : 1;
        this.coords.sort((a, b) => a[sort_key] - b[sort_key]);
    }

    /**
     * Rotate the ship by changing the ship's coordinates accordingly.
     *
     * @param {!Number} - Height of the grid (assumed to be equal to its width).
     */
    rotate(grid_height) {
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
            adjustment = this.coords[this.length-1][dimension] - grid_height + 1;
            if(adjustment > 0)
                for(const pair of this.coords)
                    pair[dimension] -= adjustment;
        }

        return true;
    }

    /**
     * Returns whether the ship's state is valid, meaning its coordinates are
     * [sorted]{@link module:classes/ship~Ship#sort_coords} and have the
     * original length. This test might be necessary, because dragging will add
     * and remove coordinate pairs without respecting order.
     *
     * @returns {Boolean} whether the ship is in valid state.
     */
    in_valid_state() {
        if(this.length === 1)
            return true;
        if(this.coords.length !== this.length)
            return false;

        const [same, different] = this.alignment === 'x' ? [1, 0] : [0, 1];

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
}


export { Ship };
export default Ship;
