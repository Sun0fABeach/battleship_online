const assert = require('assert');
import Ship from '../classes/ship';


context('Ship', function() {
    const ship_coords = [[0, 0], [0, 1]];
    let ship;

    beforeEach('construct ship', function() {
        const cpy = ship_coords.map(pair => Array.from(pair));
        ship = new Ship(Array.from(cpy));
    });


    describe('constructor', function() {
        it('should construct an object', function() {
            assert(ship, 'failed to construct object');
        });
    });

    describe('#coords (getter)', function() {
        it('should return the ship\'s coordinates', function() {
            assert.deepEqual(ship.coords, ship_coords);
        });
    });

    describe('#coords (setter)', function() {
        it('should set the ship\'s coordinates', function() {
            const new_coords = [[1, 2]];
            ship.coords = new_coords;
            assert.deepEqual(ship.coords, new_coords);
        });
    });

    describe('#length', function() {
        it('should return the ship\'s length', function() {
            assert.equal(ship.coords.length, ship_coords.length);
            const new_coords = [[1, 2]];
            ship.coords = new_coords;
            assert.equal(ship.coords.length, new_coords.length);
        });
    });

    describe('#alignment', function() {
        it('should return the ship\'s alignment', function() {
            assert.equal(ship.alignment, 'y');
            const new_coords = [[0, 0], [1, 0]];
            ship.coords = new_coords;
            assert.equal(ship.alignment, 'x');
        });
    });

    describe('#dimensions', function() {
        it('should return the ship\'s dimensions', function() {
            assert.deepEqual(ship.dimensions, [1, ship_coords.length]);
            const new_coords = [[0, 0], [1, 0]];
            ship.coords = new_coords;
            assert.deepEqual(ship.dimensions, [ship_coords.length, 1]);
        });
    });

    describe('#add_coords()', function() {
        it('should add a coordinate pair to the ship', function() {
            const coords_to_add = [0, 2];
            ship.add_coords(coords_to_add);
            assert.deepEqual(ship.coords, ship_coords.concat([coords_to_add]));
        });
    });

    describe('#remove_coords()', function() {
        it('should remove a coordinate pair of the ship', function() {
            const nonexistent_coords = [-9, -9];
            ship.remove_coords(nonexistent_coords);
            assert.deepEqual(ship.coords, ship_coords);
            const coords_to_remove = ship_coords[0];
            ship.remove_coords(coords_to_remove);
            assert.deepEqual(ship.coords, ship_coords.slice(1));
        });
    });

    describe('#has_coords()', function() {
        it('should return whether ship contains given coordinates', function() {
            const nonexistent_coords = [-9, -9];
            assert(!ship.has_coords(nonexistent_coords));
            const existent_coords = ship_coords[0];
            assert(ship.has_coords(existent_coords));
        });
    });

    describe('#prepare_for_battle()', function() {
        it('should be able to receive shots', function() {
            assert.throws(() => ship.receive_shot([0, 0]));
            ship.prepare_for_battle();
            assert(ship.receive_shot([0, 0]));
        });
    });

    describe('#receive_shot()', function() {
        it('should return the correct shot result', function() {
            ship.prepare_for_battle();
            let shot_result = ship.receive_shot([-9, -9]);
            assert(!shot_result.hit && !shot_result.sunken_ship);
            shot_result = ship.receive_shot([0, 0]);
            assert(shot_result.hit && !shot_result.sunken_ship);
            shot_result = ship.receive_shot([0, 1]);
            assert(shot_result.hit && shot_result.sunken_ship);
        });
    });

    describe('#sort_coords()', function() {
        it('should sort newly added coordinates', function() {
            const new_coords1 = [0, 3], new_coords2 = [0, 2];
            const sorted_coords = ship_coords.concat([new_coords2])
                                                .concat([new_coords1]);
            ship.add_coords(new_coords1);
            ship.add_coords(new_coords2);
            assert.notDeepEqual(ship.coords, sorted_coords);
            ship.sort_coords();
            assert.deepEqual(ship.coords, sorted_coords);
        });
    });

    describe('#rotate()', function() {
        it('should rotate the ship', function() {
            const rotated_coords = [[0, 0], [1, 0]];
            ship.rotate(2);
            assert.deepEqual(ship.coords, rotated_coords);
            assert.equal(ship.alignment, 'x');
        });
    });

    describe('#in_valid_state()', function() {
        it('should return whether ship\'s coordinates are valid', function() {
            const new_coords = [0, 2];
            ship.add_coords(new_coords); // [0, 0], [0, 1], [0, 2]
            assert(!ship.in_valid_state());

            ship.remove_coords(new_coords); // [0, 0], [0, 1]
            assert(ship.in_valid_state());

            const coords_to_delete = [0, 1];
            ship.remove_coords(coords_to_delete); // [0, 0]
            assert(!ship.in_valid_state());

            ship.add_coords(new_coords); // [0, 0], [0, 2]
            assert(!ship.in_valid_state());

            ship.remove_coords(new_coords);
            ship.add_coords(coords_to_delete); // [0, 0], [0, 1]
            assert(ship.in_valid_state());
        });
    });
});
