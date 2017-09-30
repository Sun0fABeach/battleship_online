export default class Ship {
    constructor(coords) {
        this._intact = Array.from(coords);
        this._destroyed = [];
    }

    take_shot(shot_coords) {
        let hit = false;

        this._intact.forEach((coord_pair, index) => {
            if(this._equal_coords(shot_coords, coord_pair)) {
                this._destroyed.push(coord_pair);
                this._intact.splice(index, 1);
                hit = true;
                return;
            }
        });

        if(hit)
            return this._intact.length === 0 ? this : true;

        return false;
    }

    get coords() {
        return this._intact.concat(this._destroyed);
    }

    _equal_coords(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
}
