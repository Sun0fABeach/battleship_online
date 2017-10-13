import * as ship_placement from './ship_placement';
import * as battle from './battle';
import { HostModal, ErrorModal } from './classes/modal';
import MenuButton from './classes/menu_button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
let $name_input;
let player_name, opponent_name;
const text_handlers = {};
const modals = {};
const menu_buttons = {};

const messages = {
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
    'Commencing battle!',
};


export function init(socket) {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');
    $name_input = $('#player-name');

    init_text_handlers();
    init_modals(socket);
    init_menu_buttons(socket);
}


function init_text_handlers() {
    text_handlers.player_name = new Text($('#player-side > p:first-child'));
    text_handlers.opponent_name = new Text($('#opponent-side > p:first-child'));
    text_handlers.game_msg = new Text($('#main-menu > p:first-child > span'));
}


function init_modals(socket) {
    modals.host_list = new HostModal(
        $('#host-modal'),
        {
            backdrop: 'static',
            keyboard: false
        },
        socket,
        (host_name) => {
            opponent_name = host_name;
            toggle_dual_grid(true);
            text_handlers.opponent_name.change(host_name);
            const msg = messages.connected;
            text_handlers.game_msg.change(
                msg[0] + host_name + msg[1] + ' ' + messages.finish_placement
            );
            show_menu_buttons(['abort', 'ready']);
        },
        () => {
            text_handlers.game_msg.change(messages.host_or_join);
            show_menu_buttons(['host', 'open_hosts']);
        }
    );

    modals.error = new ErrorModal(
        $('#error-modal'),
        'show'
    );
}


function init_menu_buttons(socket) {
    menu_buttons.enter = new MenuButton('enter',
        () => {
            if(!validate_player_name()) {
                $name_input.focus();
                menu_buttons.enter.invalid();
                $name_input.one('input', () => menu_buttons.enter.normal());
                text_handlers.game_msg.change(messages.name_enter);
            } else {
                player_name = get_player_name();
                socket.emit('name register', player_name);
                menu_buttons.enter.clickable(false);
            }
        }
    );

    $('#main-menu form').on('submit', menu_buttons.enter.click);

    socket.on('name taken', () => {
        menu_buttons.enter.invalid();
        menu_buttons.enter.clickable(true);
        text_handlers.game_msg.change(messages.name_taken);
    });

    socket.on('name accepted', () => {
        $name_input.fadeOut();
        show_menu_buttons(['host', 'open_hosts']);
        text_handlers.player_name.change(player_name);
        text_handlers.game_msg.change(messages.host_or_join);
    });


    menu_buttons.host = new MenuButton('host',
        () => {
            menu_buttons.open_hosts.clickable(false);
            socket.emit('host');
        }
    );

    socket.on('host failed', (reason) => {
        menu_buttons.open_hosts.clickable(true);
        modals.error.open('Failed to host: ' + reason);
    });

    socket.on('host success', () => {
        toggle_dual_grid(true);
        show_menu_buttons(['abort']);
        text_handlers.game_msg.change(messages.wait_for_join);
    });

    socket.on('opponent entered', (opponent) => {
        opponent_name = opponent;
        show_menu_buttons(['abort', 'ready']);
        text_handlers.opponent_name.change(opponent_name);
        const msg = messages.opponent_joined;
        text_handlers.game_msg.change(
            msg[0] + opponent_name + msg[1] + ' ' + messages.finish_placement
        );
    });


    menu_buttons.open_hosts = new MenuButton('open-hosts',
        () => {
            modals.host_list.open(player_name);
            show_menu_buttons(null);
            text_handlers.game_msg.change(messages.choose_host);
        }
    );


    menu_buttons.abort = new MenuButton(
        'abort',
        () => {
            socket.emit('abort');
            toggle_dual_grid(false);
            show_menu_buttons(['host', 'open_hosts']);
            text_handlers.opponent_name.change('Opponent');
            text_handlers.game_msg.change(messages.host_or_join);
        }
    );


    menu_buttons.leave = new MenuButton('leave', end_battle);

    socket.on('opponent left', () => {
        /* rare corner case: player clicked abort, grid is made single and
           shortly afterwards, this event arrives b/c opponent aborted or
           disconnected at the same time. */
        if(!is_dual_grid())
            return;
        modals.error.open(opponent_name + ' has left the game.');
        end_battle();
    });


    menu_buttons.ready = new MenuButton('ready',
        () => {
            if(!ship_placement.is_valid()) {
                menu_buttons.ready.invalid();
                text_handlers.game_msg.change(messages.invalid_placement);
                return;
            }

            battle.set_player_ships(ship_placement.deactivate());
            menu_buttons.ready.clickable(false);

            socket.emit('ready', (other_ready) => {
                if(other_ready) {
                    start_battle();
                } else {
                    menu_buttons.ready.hide();
                    const msg = messages.placement_wait;
                    text_handlers.game_msg.change(
                        msg[0] + opponent_name + msg[1]
                    );
                }
            });
        }
    );

    socket.on('opponent ready', start_battle);


    menu_buttons.slide = new MenuButton('slide',
        () => $player_side.find('.game-grid').slideToggle()
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

function validate_player_name() {
    if(get_player_name() === '') {
        $name_input.val('');
        return false;
    }
    return true;
}

function get_player_name() {
    return $name_input.val().trim();
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

function is_dual_grid() {
    return $both_sides.hasClass('dual-view');
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

function start_battle() {
    battle.activate();
    show_menu_buttons(['slide', 'leave']);
    text_handlers.game_msg.change(messages.battle_start);
}

function end_battle() {
    $player_side.find('.game-grid').slideDown(() => {
        ship_placement.activate();
        toggle_dual_grid(false);
    });
    show_menu_buttons(['host', 'open_hosts'], battle.deactivate);
    text_handlers.opponent_name.change('Opponent');
    text_handlers.game_msg.change(messages.host_or_join);
}
