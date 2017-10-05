import * as communications from './communications';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import { HostModal, ErrorModal } from './classes/modal';
import MenuButton from './classes/menu_button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
let player_name;
const text_handlers = {};
const modals = {};
const menu_buttons = {};


export function init() {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');

    text_handlers.player_name = new Text($('#player-side > p:first-child'));
    text_handlers.opponent_name = new Text($('#opponent-side > p:first-child'));
    text_handlers.game_msg = new Text($('#main-menu > p:first-child > span'));

    init_modals();
    init_menu_buttons();
}


function init_modals() {
    modals.host_list = new HostModal(
        $('#host-modal'),
        {
            backdrop: 'static',
            keyboard: false
        },
        (host) => {
            text_handlers.game_msg.change(
                'Connecting to player <strong>'+host.name+'</strong> ...'
            );
            communications.join_host(host.id, player_name,
                () => {
                    toggle_dual_grid(true);
                    text_handlers.opponent_name.change(host.name);
                    text_handlers.game_msg.change(
                        'Connected to <strong>'+host.name+'</strong>. ' +
                        'Finish ship placement and press <strong>Ready</strong>.'
                    );
                    show_menu_buttons(['abort', 'ready']);
                },
                () => {
                    modals.error.open('Failed to join '+host.name+'.');
                    text_handlers.game_msg.change(
                        'Choose <strong>Host</strong> to host a game, ' +
                        'or <strong>Join</strong> to join a hosted game.'
                    );
                    show_menu_buttons(['host', 'open_hosts']);
                }
            )
        },
        () => {
            text_handlers.game_msg.change(
                'Choose <strong>Host</strong> to host a game, ' +
                'or <strong>Join</strong> to join a hosted game.'
            );
            show_menu_buttons(['host', 'open_hosts']);
        }
    );

    modals.error = new ErrorModal(
        $('#error-modal'),
        {
            backdrop: 'static'
        }
    );
}


function init_menu_buttons() {
    MenuButton.init(text_handlers.game_msg);

    menu_buttons.enter = new MenuButton(
        'enter',
        () => get_player_name(),
        () => {
            player_name = get_player_name();
            hide_name_input();
            text_handlers.player_name.change(player_name);
            show_menu_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        'Please enter your <strong>name</strong>.'
    );

    menu_buttons.host = new MenuButton(
        'host',
        () => true,
        () => {
            communications.host(
                () => {
                    communications.request_opponent(
                        (opponent_name) => {
                            text_handlers.opponent_name.change(opponent_name);
                            text_handlers.game_msg.change(
                                'Player <strong>'+opponent_name+'</strong> joined. ' +
                                'Finish ship placement and press <strong>Ready</strong>.'
                            );
                            show_menu_buttons(['abort', 'ready']);
                        },
                        () => {
                            modals.error.open('Server aborted hosting (timeout).');
                            menu_buttons.abort.click();
                        }
                    );
                },
                () => {
                    modals.error.open('Server rejected hosting request.');
                    menu_buttons.abort.click();
                }
            );

            toggle_dual_grid(true);
            show_menu_buttons(['abort']);
        },
        'Waiting for an opponent to join ...',
        undefined
    );

    menu_buttons.open_hosts = new MenuButton(
        'open-hosts',
        () => true,
        () => {
            modals.host_list.open();
            show_menu_buttons(null);
        },
        'Choose a host.',
        undefined
    );

    menu_buttons.abort = new MenuButton(
        'abort',
        () => true,
        () => {
            communications.cancel_request();
            toggle_dual_grid(false);
            text_handlers.opponent_name.change('Opponent');
            show_menu_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    menu_buttons.ready = new MenuButton(
        'ready',
        () => ship_placement.is_valid(),
        () => {
            const ships = ship_placement.deactivate();
            show_menu_buttons(['slide', 'leave'], () => battle.activate(ships));
        },
        'Commencing battle!',
        'You have <strong>invalid</strong> ship placements.'
    );

    menu_buttons.leave = new MenuButton(
        'leave',
        () => true,
        () => {
            $player_side.find('.game-grid').slideDown(() => {
                ship_placement.activate();
                toggle_dual_grid(false);
            });
            text_handlers.opponent_name.change('Opponent');
            show_menu_buttons(['host', 'open_hosts'], battle.deactivate);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    menu_buttons.slide = new MenuButton(
        'slide',
        () => true,
        () => $player_side.find('.game-grid').slideToggle(),
        undefined,
        undefined
    );
}


function show_menu_buttons(to_show, callback) {
    let cb_registered = false;

    for(const button of Object.values(menu_buttons)) {
        if(button.is_visible()) {
            if(!cb_registered) {
                button.hide(() => {
                    show_menu_buttons_do_action(to_show, callback);
                });
                cb_registered = true;
            } else {
                button.hide();
            }
        }
    }

    // if no button was there to hide, we still need to trigger this
    if(!cb_registered)
        show_menu_buttons_do_action(to_show, callback);
}

function show_menu_buttons_do_action(menu_buttons_to_show, action) {
    if(menu_buttons_to_show)
        menu_buttons_to_show.forEach(name => menu_buttons[name].show());
    if(action)
        action();
}

function get_player_name() {
    return $('#player-name').val();
}

function hide_name_input() {
    $('#player-name').fadeOut();
}

function toggle_dual_grid(active) {
    if(adjacent_grids()) {
        $grids_container.fadeOut(() => {
            set_grid_split(active);
            $grids_container.fadeIn();
        });
    } else {
        set_grid_split(active);
    }
}

function set_grid_split(active) {
    if(active)
        $both_sides.addClass('dual-view');
    else
        $both_sides.removeClass('dual-view');
}

function adjacent_grids() {
    return $(window).width() >= 768; // hard-coded bootstrap md-breakpoint
}
