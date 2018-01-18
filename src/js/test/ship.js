const assert = require('assert');
import Ship from '../classes/ship';

context('Ship', function() {
    describe('constructor', function() {
        it('should construct an object', function() {
            assert(new Ship([[0, 0], [0, 1]]), 'failed to construct object');
        });
    });
});
