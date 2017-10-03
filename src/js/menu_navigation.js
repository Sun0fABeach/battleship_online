import * as communications from './communications';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import { HostModal, ErrorModal } from './classes/modal';
import Button from './classes/button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
const text_handlers = {};
const modals = {};
const buttons = {};


export function init() {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');

    text_handlers.player_name = new Text($('#player-side > p:first-child'));
    text_handlers.opponent_name = new Text($('#opponent-side > p:first-child'));
    text_handlers.game_msg = new Text($('#game-message > span'));

    modals.host_list = new HostModal(
        $('#host-modal'),
        {
            backdrop: 'static',
            keyboard: false
        },
        () => {
            show_buttons(['host', 'open_hosts']);
            text_handlers.game_msg.change(
                'Choose <strong>Host</strong> to host a game, ' +
                'or <strong>Join</strong> to join a hosted game.'
            );
        }
    );
    modals.error = new ErrorModal($('#error-modal'), {
        backdrop: 'static'
    });

    init_buttons();
}


function init_buttons() {
    Button.init(text_handlers.game_msg);

    buttons.enter = new Button(
        $('button[name="enter"]'),
        () => player_name(),
        () => {
            hide_name_input();
            text_handlers.player_name.change(player_name());
            show_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        'Please enter your <strong>name</strong>.'
    );

    buttons.host = new Button(
        $('button[name="host"]'),
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
                            show_buttons(['abort', 'ready']);
                        },
                        () => {
                            modals.error.open('Server aborted hosting (timeout).');
                            buttons.abort.click();
                        }
                    );
                },
                () => {
                    modals.error.open('Server rejected hosting request.');
                    buttons.abort.click();
                }
            );

            toggle_dual_grid(true);
            show_buttons(['abort']);
        },
        'Waiting for an opponent to join ...',
        undefined
    );

    buttons.open_hosts = new Button(
        $('button[name="open-hosts"]'),
        () => true,
        () => {
            modals.host_list.open();
            show_buttons(null);
        },
        'Choose a host.',
        undefined
    );

    buttons.abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => {
            communications.cancel_request();
            toggle_dual_grid(false);
            text_handlers.opponent_name.change('Opponent');
            show_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    buttons.ready = new Button(
        $('button[name="ready"]'),
        () => ship_placement.is_valid(),
        () => {
            const ships = ship_placement.deactivate();
            show_buttons(['slide', 'leave'], () => battle.activate(ships));
        },
        'Commencing battle!',
        'You have <strong>invalid</strong> ship placements.'
    );

    buttons.leave = new Button(
        $('button[name="leave"]'),
        () => true,
        () => {
            $player_side.find('.game-grid').slideDown(() => {
                ship_placement.activate();
                toggle_dual_grid(false);
            });
            text_handlers.opponent_name.change('Opponent');
            show_buttons(['host', 'open_hosts'], battle.deactivate);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    buttons.slide = new Button(
        $('button[name="slide"]'),
        () => true,
        () => $player_side.find('.game-grid').slideToggle(),
        undefined,
        undefined
    );
}


function show_buttons(to_show, callback) {
    let cb_registered = false;

    for(const button of Object.values(buttons)) {
        if(button.is_visible()) {
            if(!cb_registered) {
                button.hide(() => {
                    show_buttons_do_action(to_show, callback);
                });
                cb_registered = true;
            } else {
                button.hide();
            }
        }
    }

    // if no button was there to hide, we still need to trigger this
    if(!cb_registered)
        show_buttons_do_action(to_show, callback);
}

function show_buttons_do_action(buttons_to_show, action) {
    if(buttons_to_show)
        buttons_to_show.forEach(name => buttons[name].show());
    if(action)
        action();
}

function player_name() {
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
