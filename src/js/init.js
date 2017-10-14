import * as menu_navigation from './menu_navigation';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import { Grid, OwnGrid } from './classes/grid';
import io from 'socket.io-client';


$(document).ready(function() {
    const socket = io('http://localhost:3000');
    const player_grid = new OwnGrid($('#player-side table'));
    const opponent_grid = new Grid($('#opponent-side table'));

    socket.on('connect', () => {
        menu_navigation.init(socket);
        ship_placement.init(player_grid);
        ship_placement.activate();
        battle.init(socket, player_grid, opponent_grid);
    });

    socket.on('connect_error', (error) => {
        error_screen(error);
    });
    socket.on('connect_timeout', (error) => {
        error_screen(error);
    });
    socket.on('error', (error) => {
        error_screen(error);
    });
});

function error_screen(error) {
    $('body').empty().append(
        $('<h1>').text(error).css('text-align', 'center')
    );
}
