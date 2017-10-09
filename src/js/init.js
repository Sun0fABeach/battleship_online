import * as menu_navigation from './menu_navigation';
import * as communications from './communications';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import io from 'socket.io-client';


$(document).ready(function() {
    const socket = io('http://localhost:3000');
    socket.on('connect', () => {
        menu_navigation.init(socket);
        ship_placement.init();
        ship_placement.activate();
        battle.init(socket);
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
