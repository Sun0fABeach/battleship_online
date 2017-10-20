import Ship from './classes/ship';
import { grids, text, modals } from './ui';
import { adjacent_grid_mode } from './helpers';

let socket;
let battle_active;
const ship_count = {
    total: 0,
    intact: {
        player: 0,
        opponent: 0
    }
};


export function init(sock) {
    battle_active = false;
    socket = sock;
}

export function activate(player_begins) {
    battle_active = true;
    ship_count.total = grids.player.num_ships;
    ship_count.intact.player = ship_count.intact.opponent = ship_count.total;

    if(player_begins) {
        if(adjacent_grid_mode())            // set without actually sliding up
            grids.player.slid_up = true;    // for state consistency
        else
            grids.player.slideUp();
        let_player_shoot(true);
    } else {
        let_opponent_shoot(true);
    }
}

export function deactivate() {
    battle_active = false;
    set_crosshair(false);

    clear_opponent_grid();
    clear_player_grid();

    text.opponent_name.bold(false);
    text.player_name.bold(false);
}

function clear_opponent_grid() {
    grids.opponent
    .tiles
    .removeClass('ship')
    .children().remove();

    grids.opponent.table.off('click');
}

function clear_player_grid() {
    grids.player
    .unregister_ships()
    .tiles
    .children().remove();
}

function let_player_shoot(first_shot=false) {
    set_crosshair(true);
    text.opponent_name.bold(true);
    text.player_name.bold(false);

    grids.opponent.table.one('click', 'td:not(:has(i))', function() {
        const $tile = $(this);
        set_crosshair(false);

        socket.emit(
            'shot',
            grids.opponent.tile_to_coords($tile),
            (shot_result) => handle_player_shot_result(
                shot_result, $tile, first_shot
            )
        );
    });
}

function handle_player_shot_result(shot_result, $tile, first_shot) {
    if(!battle_active) // battle might have been aborted before result arrives
        return;

    if(shot_result.sunken_ship) {
        --ship_count.intact.opponent;
        display_sunk_ship_count(first_shot);
    } else if(first_shot) { // switch to displaying score on first shot
        display_sunk_ship_count(true);
    }

    display_shot({
        grid: 'opponent',
        hit: shot_result.hit,
        ship_to_reveal: shot_result.sunken_ship,
        $tile: $tile
    });

    if(shot_result.defeat)
        game_over_handler(true);
    else
        let_opponent_shoot();
}

function let_opponent_shoot(first_shot=false) {
    text.opponent_name.bold(false);
    text.player_name.bold(true);

    socket.once('shot',
        (coord_pair, inform_result_cb) =>
        handle_opponent_shot(coord_pair, inform_result_cb, first_shot)
    );
}

function handle_opponent_shot(coord_pair, inform_result_cb, first_shot) {
    if(!battle_active) // might have been aborted before shot arrived
        return;
    if(first_shot)
        display_sunk_ship_count(true);

    const $tile = grids.player.coords_to_tile(coord_pair);
    const ship = grids.player.get_ship($tile);
    const shot_result = ship ? ship.receive_shot(coord_pair) : {hit: false};

    display_shot({
        grid: 'player',
        hit: shot_result.hit,
        $tile: $tile
    });

    if(shot_result.sunken_ship && --ship_count.intact.player === 0) {
        shot_result.defeat = true;
        game_over_handler(false);
    } else {
        let_player_shoot();
    }

    inform_result_cb(shot_result);
}

function game_over_handler(victory) {
    battle_active = false;
    setTimeout(() => modals.game_over.open(victory), 1500);
}

function display_sunk_ship_count(first_shot) {
    let num_sunk = ship_count.total - ship_count.intact.opponent;
    const msg = 'Score: <strong>' +
                num_sunk + '/' + ship_count.total +
                '</strong> ships';
    text.game_msg.change(msg, first_shot);
}

function display_shot(shot_data) {
    if(adjacent_grid_mode()) {
        mark_shot(shot_data);
        /* notice how any shot reveal would end up with a slid up player grid
           on small screens (else-block below). therefore, we set the slid_up
           state manually here for state consistency. */
        grids.player.slid_up = true;
    } else {
        if(shot_data.grid === 'player') {
            const mark_to = grids.player.slid_up ? 200 : 0;
            grids.player.slideDown(() => {
                setTimeout(() => {
                    mark_shot(shot_data);
                    setTimeout(() => {
                        // don't slide up when the shot defeated the player
                        if(battle_active)
                            grids.player.slideUp();
                    }, 800);
                }, mark_to);
            });
        } else {
            const mark_to = grids.player.slid_up ? 0 : 200;
            grids.player.slideUp(() => {
                setTimeout(() => {
                    mark_shot(shot_data);
                }, mark_to);
            });
        }
    }
}

function mark_shot(shot_data) {
    const marker_classes = shot_data.hit ? 'fa fa-times' : 'fa fa-bullseye';
    const $marker = $('<i>').addClass(marker_classes);
    shot_data.$tile.append($marker);
    const marker_color = $marker.css('color');

    $marker.animate(
        { 'background-color': 'transparent' },
        {
            start: () => {
                $marker.css('background-color', marker_color);
                indicate_recent_shot($marker, marker_color, shot_data.grid);
                if(shot_data.ship_to_reveal)
                    reveal_ship(shot_data.ship_to_reveal);
            },
            duration: 600
        }
    );
}

const indicate_recent_shot = function() {
    const prev_shot_marker = {
        player: null,
        opponent: null
    };

    return function($marker, color, side) {
        if(prev_shot_marker[side])
            prev_shot_marker[side].css('box-shadow', '');

        $marker.css('box-shadow', '0 0 0.6rem 0.2rem ' + color + ' inset');
        prev_shot_marker[side] = $marker;
    };
}();

function reveal_ship(ship_coords) {
    for(const coord_pair of ship_coords)
        grids.opponent.coords_to_tile(coord_pair).addClass('ship');
}

function set_crosshair(active) {
    grids.opponent.table.css('cursor', active ? 'crosshair' : '');
}
