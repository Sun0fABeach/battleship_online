/**
 * Provides access to objects representing UI elements.
 * @module ui
 */

import { Grid, OwnGrid } from './classes/grid';
import MenuButton from './classes/menu_button';
import Text from './classes/text';
import {
    HostModal,
    LeaveConfirmModal,
    GameOverModal,
    AcknowledgeModal
} from './classes/modal';

/** Game message strings (displayed below grids) */
export const msg = {
    name_enter:
    'Please enter your <strong>name</strong>.',
    name_taken:
    'The name you entered is already in use.',
    choose_host:
    'Choose a host.',
    host_or_join:
    'Choose <strong>Host</strong> to host a game, ' +
    'or <strong>Join</strong> to join a hosted game.',
    wait_for_join:
    'Waiting for an opponent to join ...',
    opponent_joined:
    ['Player <strong>', '</strong> joined.'],
    connected:
    ['Connected to <strong>', '</strong>.'],
    finish_placement:
    'Finish ship placement and press <strong>Ready</strong>.',
    invalid_placement:
    'You have <strong>invalid</strong> ship placements.',
    placement_wait:
    ['Waiting for <strong>', '</strong> to finish ship placement ...'],
    battle_start:
    'Battle commencing!',
    player_begins:
    'You take the first shot.',
    opponent_begins:
    ['<strong>', '</strong> takes the first shot.']
};

/** [Text]{@link module:classes/text} objects */
export const text = {};
/** [Modal]{@link module:classes/modal} objects */
export const modals = {};
/** [MenuButton]{@link module:classes/menu_button} objects */
export const menu_buttons = {};
/** [Grid]{@link module:classes/grid} objects */
export const grids = {};
/** [jQuery]{@link http://api.jquery.com/Types/#jQuery} text input objects */
export const input = {};
/** [jQuery]{@link http://api.jquery.com/Types/#jQuery} site footer object */
export let footer;


/**
 * Construct UI element objects to make them available as exported variables.
 *
 * @param {io.Socket} socket -
 *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
 */
export function init(socket) {
    init_text_handlers();
    init_modals(socket);
    init_menu_buttons();
    init_grids();
    init_input();
    footer = $('footer');
}


function init_text_handlers() {
    text.player_name = new Text($('#player-side > p:first-child'));
    text.opponent_name = new Text($('#opponent-side > p:first-child'));
    text.game_msg = new Text($('#main-menu > p:first-child > span'));
}

function init_modals(socket) {
    modals.host_list = new HostModal($('#host-modal'), socket);
    modals.game_over = new GameOverModal($('#basic-interaction-modal'), socket);
    modals.ack = new AcknowledgeModal($('#basic-interaction-modal'));
    modals.leave_confirm = new LeaveConfirmModal($('#basic-interaction-modal'));
}

function init_menu_buttons() {
    menu_buttons.enter = new MenuButton('enter');
    menu_buttons.host = new MenuButton('host');
    menu_buttons.open_hosts = new MenuButton('open-hosts');
    menu_buttons.randomize = new MenuButton('randomize');
    menu_buttons.ready = new MenuButton('ready');
    menu_buttons.abort = new MenuButton('abort');
    menu_buttons.slide = new MenuButton('slide');
    menu_buttons.give_up = new MenuButton('give-up');
}

function init_grids() {
    grids.$container = $('#grids-container');
    grids.$both = $('.grid-wrapper');
    grids.player = new OwnGrid($('#player-side'));
    grids.opponent = new Grid($('#opponent-side'));
}

function init_input() {
    input.$name = $('input[name=player-name]');
}
