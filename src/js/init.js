/**
 * Initializes application via $(document).ready().
 * @module init
 */

import { DnDShipPlacement } from './classes/ship_placement';
import * as menu_navigation from './menu_navigation';
import * as overlay_screen from './overlay_screen';
import * as battle from './battle';
import * as ui from './ui';
import { swap_in_socket_handlers } from './helpers';
import io from 'socket.io-client';


$(function() {
    // const socket = io('http://localhost:3000');
    const socket = io();

    socket.on('connect', () => {
        swap_in_socket_handlers(socket);
        ui.init(socket);
        const dnd_ship_placement = new DnDShipPlacement();
        dnd_ship_placement.activate();
        menu_navigation.init(dnd_ship_placement, socket);
        overlay_screen.init();
        battle.init();

        $('#loading-screen > h2').text('Done');
        $('#loading-screen').slideUp(1500);

        /* add dummy element containing fonts and spritesheets to
           trigger downloads asynchronously (these assets are needed later) */
        const $dummy = $('<div>').appendTo('body').css({
            position: 'absolute',
            top: 0,
            visibility: 'hidden',
            zIndex: -9999,
        });
        $dummy.append($('<i>').css('fontFamily', 'speechBubble'));
        $dummy.append($('<i>').addClass('fa fa-times'));
        $dummy.append($('<i>').addClass('explosion'));
    });
});
