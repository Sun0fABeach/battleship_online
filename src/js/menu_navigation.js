import * as ship_placement from './ship_placement';
import * as battle from './battle';
import { HostModal, ErrorModal } from './classes/modal';
import MenuButton from './classes/menu_button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
let $name_input
let player_name, opponent_name;
const text_handlers = {};
const modals = {};
const menu_buttons = {};

const messages = {
    name_enter:
    'Please enter your <strong>name</strong>.',
    name_taken:
    'The name you entered is already in use.',
    host_or_join:
    'Choose <strong>Host</strong> to host a game, ' +
    'or <strong>Join</strong> to join a hosted game.',
    wait_for_join:
    'Waiting for an opponent to join ...',
    finish_placement:
    'Finish ship placement and press <strong>Ready</strong>.',
    invalid_placement:
    'You have <strong>invalid</strong> ship placements.',
    battle_start:
    'Commencing battle!',
};


export function init(socket) {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');
    $name_input = $('#player-name');

    text_handlers.player_name = new Text($('#player-side > p:first-child'));
    text_handlers.opponent_name = new Text($('#opponent-side > p:first-child'));
    text_handlers.game_msg = new Text($('#main-menu > p:first-child > span'));

    init_modals(socket);
    init_menu_buttons(socket);

    $('#main-menu form').on('submit', menu_buttons.enter.click);
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
            text_handlers.game_msg.change(
                'Connected to <strong>'+host_name+'</strong>. ' +
                messages.finish_placement
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
    MenuButton.init(text_handlers.game_msg);

    menu_buttons.enter = new MenuButton(
        'enter',
        validate_player_name,
        () => {
            player_name = get_player_name();
            socket.emit('name register', player_name);
            menu_buttons.enter.clickable(false);
        },
        undefined,
        messages.name_enter
    );

    socket.on('name taken', () => {
        menu_buttons.enter.invalid();
        menu_buttons.enter.clickable(true);
        text_handlers.game_msg.change(messages.name_taken);
    });

    socket.on('name accepted', () => {
        hide_name_input();
        show_menu_buttons(['host', 'open_hosts']);
        text_handlers.player_name.change(player_name);
        text_handlers.game_msg.change(messages.host_or_join);
    });


    menu_buttons.host = new MenuButton(
        'host',
        () => true,
        () => {
            menu_buttons.open_hosts.clickable(false);
            socket.emit('host');
        },
        undefined,
        undefined
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
        text_handlers.game_msg.change(
            'Player <strong>'+opponent_name+'</strong> joined. ' +
            messages.finish_placement
        );
    });


    menu_buttons.open_hosts = new MenuButton(
        'open-hosts',
        () => true,
        () => {
            modals.host_list.open(player_name);
            show_menu_buttons(null);
        },
        'Choose a host.',
        undefined
    );

    menu_buttons.abort = new MenuButton(
        'abort',
        () => true,
        () => {
            socket.emit('abort');
            toggle_dual_grid(false);
            text_handlers.opponent_name.change('Opponent');
            show_menu_buttons(['host', 'open_hosts']);
        },
        messages.host_or_join,
        undefined
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
        messages.host_or_join,
        undefined
    );

    socket.on('opponent left', () => {
        /* rare corner case: player clicked abort, grid is made single and
           shortly afterwards, this event arrives b/c opponent aborted or
           disconnected at the same time. */
        if(!is_dual_grid())
            return;

        modals.error.open(opponent_name + ' has left the game.');

        $player_side.find('.game-grid').slideDown(() => {
            ship_placement.activate();
            toggle_dual_grid(false);
        });
        text_handlers.opponent_name.change('Opponent');
        text_handlers.game_msg.change(messages.host_or_join);
        show_menu_buttons(['host', 'open_hosts'], battle.deactivate);
    });


    menu_buttons.ready = new MenuButton(
        'ready',
        () => ship_placement.is_valid(),
        () => {
            battle.set_player_ships(ship_placement.deactivate());
            menu_buttons.ready.clickable(false);

            socket.emit('ready', (other_ready) => {
                if(other_ready) {
                    start_battle();
                } else {
                    menu_buttons.ready.hide();
                    text_handlers.game_msg.change(
                        'Waiting for <strong>'+opponent_name+'</strong>'+
                        ' to finish ship placement ...'
                    );
                }
            });
        },
        undefined,
        messages.invalid_placement
    );

    socket.on('opponent ready', start_battle);


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

function validate_player_name() {
    if(get_player_name() === '') {
        $name_input.focus();
        return false;
    }
    return true;
}

function get_player_name() {
    return $name_input.val().trim();
}

function hide_name_input() {
    $name_input.fadeOut();
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
