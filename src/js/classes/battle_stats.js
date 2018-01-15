/** Module containing the battle statistics class.
    @module classes/battle_stats */

/** Battle statistics class. */
export default class BattleStats {
    /**
     * Create a BattleStats instance.
     * @param {!Number} num_ships - total number of ships in a fleet.
     */
    constructor(num_ships) {
        const record_template = {
            hits: 0,
            misses: 0,
            ships_sunk: 0
        };
        this._record = {
            player: Object.assign({}, record_template),
            opponent: Object.assign({}, record_template),
            ships_total: num_ships
        };
    }

    /**
     * Record a hit for the given side.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     */
    record_hit(side) {
        this._record[side].hits++;
    }

    /**
     * Return number of hits the given side scored.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     * @returns {Number} The number of hits the given side scored.
     */
    hits(side) {
        return this._record[side].hits;
    }

    /**
     * Record a miss for the given side.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     */
    record_miss(side) {
        this._record[side].misses++;
    }

    /**
     * Return number of misses the given side scored.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     * @returns {Number} The number of misses the given side scored.
     */
    misses(side) {
        return this._record[side].misses;
    }

    /**
     * Return number of shots the given side fired.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     * @returns {Number} The number of shots the given side fired.
     */
    total_shots(side) {
        return this.hits(side) + this.misses(side);
    }

    /**
     * Record a sunk ship for the given side.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     */
    record_sunk_ship(side) {
        this._record[side].ships_sunk++;
    }

    /**
     * Return number of ships the given side sunk.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     * @returns {Number} The number of ships the given side sunk.
     */
    ships_sunk(side) {
        return this._record[side].ships_sunk;
    }

    /**
     * Return number of ships the given side still has to sink.
     *
     * @param {!String} side - Either 'player' or 'opponent'.
     * @returns {Number} The number of ships the given side still has to sink.
     */
    ships_to_sink(side) {
        return this.ships_total - this.ships_sunk(side);
    }

    /**
     * Return the total fleet size (same for either side).
     *
     * @returns {Number} The total fleet size.
     */
    get ships_total() {
        return this._record.ships_total;
    }
}
