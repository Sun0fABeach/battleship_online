/**
 * Initializes application via $(document).ready().
 * @module init
 */

import * as menu_navigation from './menu_navigation';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import * as ui from './ui';
import { swap_in_socket_handlers } from './helpers';
import io from 'socket.io-client';


$(document).ready(function() {
    // const socket = io('http://localhost:3000');
    const socket = io();

    socket.on('connect', () => {
        swap_in_socket_handlers(socket);
        ui.init(socket);
        menu_navigation.init(socket);
        ship_placement.init();
        ship_placement.activate();
        battle.init(socket);

        $('#loading-screen > h2').text('Done');
        $('#loading-screen').slideUp(1500);

        /* add dummy element containing font-awesome symbol to trigger font
           download asynchronously (font needed for shot symbols later) */
        $('<i>').addClass('fa fa-times').appendTo('body').css({
            position: 'absolute',
            top: 0,
            visibility: 'hidden',
            zIndex: -9999
        });
    });
});
