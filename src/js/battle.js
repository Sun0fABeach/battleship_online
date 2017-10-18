import Ship from './classes/ship';
import { grids } from './ui';
import { adjacent_grid_mode } from './helpers';

let socket;
let battle_active;


export function init(sock) {
    battle_active = false;
    socket = sock;
}

export function activate(player_begins) {
    battle_active = true;
    if(player_begins) {
        if(adjacent_grid_mode())            // set without actually sliding up
            grids.player.slid_up = true;    // for state consistency
        else
            grids.player.slideUp();
        let_player_shoot();
    } else {
        let_opponent_shoot();
    }
}

export function deactivate() {
    battle_active = false;
    set_crosshair(false);

    clear_opponent_grid();
    clear_player_grid();
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

function let_player_shoot() {
    set_crosshair(true);

    grids.opponent.table.one('click', 'td:not(:has(i))', function() {
        const $tile = $(this);
        set_crosshair(false);

        socket.emit(
            'shot',
            grids.opponent.tile_to_coords($tile),
            (shot_result) => handle_player_shot_result(shot_result, $tile)
        );
    });
}

function handle_player_shot_result(shot_result, $tile) {
    if(!battle_active) // battle might have been aborted before result arrives
        return;

    const sunk_ship = shot_result instanceof Array;

    display_shot({
        grid: 'opponent',
        hit: !!shot_result,
        ship_to_reveal: sunk_ship ? shot_result : null,
        $tile: $tile
    });

    let_opponent_shoot();
}

function let_opponent_shoot() {
    socket.once('shot', handle_opponent_shot);
}

function handle_opponent_shot(coord_pair, inform_result_cb) {
    if(!battle_active) // might have been aborted before shot arrived
        return;

    const $tile = grids.player.coords_to_tile(coord_pair);
    const ship = grids.player.get_ship($tile);

    inform_result_cb(ship ? ship.receive_shot(coord_pair) : false);

    display_shot({
        grid: 'player',
        hit: !!ship,
        $tile: $tile
    });

    let_player_shoot();
}

function display_shot(shot_data) {
    if(adjacent_grid_mode()) {
        mark_shot(shot_data);
    } else {
        if(shot_data.grid === 'player') {
            const mark_to = grids.player.slid_up ? 200 : 0;
            grids.player.slideDown(() => {
                setTimeout(() => {
                    mark_shot(shot_data);
                    setTimeout(() => {
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
