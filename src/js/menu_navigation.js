import * as communications from './communications';
import * as ship_placement from './ship_placement';
import * as battle from './battle';
import Button from './classes/button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
const text_handlers = {};
const buttons = {
    ctrl_panel: {},
    modal: {}
};


export function init() {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');

    text_handlers.player_name = new Text($('#player-side > p:first-child'));
    text_handlers.opponent_name = new Text($('#opponent-side > p:first-child'));
    text_handlers.game_msg = new Text($('#game-message > span'));

    init_buttons();
}


function init_buttons() {
    Button.init(text_handlers.game_msg);

    buttons.ctrl_panel.enter = new Button(
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

    buttons.ctrl_panel.host = new Button(
        $('button[name="host"]'),
        () => true,
        () => {
            communications.host(
                (opponent_name) => {
                    text_handlers.opponent_name.change(opponent_name);
                    text_handlers.game_msg.change(
                        'Player <strong>'+opponent_name+'</strong> joined. ' +
                        'Finish ship placement and press <strong>Ready</strong>.'
                    );
                    show_buttons(['abort', 'ready']);
                },
                () => {
                    alert('Could not host!');
                    buttons.ctrl_panel.abort.click();
                }
            );

            toggle_dual_grid(true);
            show_buttons(['abort']);
        },
        'Waiting for an opponent to join ...',
        undefined
    );

    buttons.ctrl_panel.open_hosts = new Button(
        $('button[name="open-hosts"]'),
        () => true,
        () => {
            hide_name_input();
            open_host_list();
            show_buttons(null);
        },
        'Choose a host.',
        undefined
    );

    buttons.ctrl_panel.abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => {
            communications.cancel_host();
            toggle_dual_grid(false);
            text_handlers.opponent_name.change('Opponent');
            show_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    buttons.ctrl_panel.ready = new Button(
        $('button[name="ready"]'),
        () => ship_placement.is_valid(),
        () => {
            const ships = ship_placement.deactivate();
            show_buttons(['slide', 'leave'], () => battle.activate(ships));
        },
        'Commencing battle!',
        'You have <strong>invalid</strong> ship placements.'
    );

    buttons.ctrl_panel.leave = new Button(
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

    buttons.ctrl_panel.slide = new Button(
        $('button[name="slide"]'),
        () => true,
        () => $player_side.find('.game-grid').slideToggle(),
        undefined,
        undefined
    );

    buttons.modal.close_hosts = new Button(
        $('button[name="close-hosts"]'),
        () => true,
        () => {
            close_host_list();
            show_buttons(['host', 'open_hosts']);
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );
}


function show_buttons(to_show, callback) {
    let cb_registered = false;

    for(const button of Object.values(buttons.ctrl_panel)) {
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
        buttons_to_show.forEach(name => buttons.ctrl_panel[name].show());
    if(action)
        action();
}

function player_name() {
    return $('#player-name').val();
}

function hide_name_input() {
    $('#player-name').fadeOut();
}

function open_host_list() {
    $('#host-modal').modal({
        backdrop: 'static',
        keyboard: false
    });
}

function close_host_list() {
    $('#host-modal').modal('hide');
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
