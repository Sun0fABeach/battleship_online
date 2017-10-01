import * as ship_placement from './ship_placement';
import * as battle from './battle';
import Button from './classes/button';
import Text from './classes/text';


let $player_side, $both_sides, $grids_container;
const buttons = {};


export function init() {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');

    init_buttons();
}


function init_buttons() {
    Button.msg_handler = new Text($('#game-message > span'));

    buttons.enter = new Button(
        $('button[name="enter"]'),
        () => player_name(),
        () => {
            hide_player_name_input();
            buttons.enter.hide(() => {
                buttons.host.show();
                buttons.join.show();
            });
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        'Please enter your <strong>name</strong>.'
    );

    buttons.host = new Button(
        $('button[name="host"]'),
        () => true,
        () => {
            toggle_dual_grid(true);
            buttons.host.hide();
            buttons.join.hide(() => {
                buttons.abort.show();
                buttons.ready.show(); // TODO: don't show until opponent joined
            });
        },
        'Waiting for an opponent to join ...',
        undefined
    );

    buttons.join = new Button(
        $('button[name="join"]'),
        () => true,
        () => {
            hide_player_name_input();
            buttons.host.hide();
            buttons.join.hide();
            open_host_list();
        },
        'Choose a host.',
        undefined
    );

    buttons.abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => {
            toggle_dual_grid(false);
            buttons.abort.hide();
            buttons.ready.hide(() => {
                buttons.host.show();
                buttons.join.show();
            });
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

            buttons.abort.hide();
            buttons.ready.hide(() => {
                buttons.slide.show();
                buttons.leave.show();
                battle.activate(ships);
            });
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

            buttons.slide.hide();
            buttons.leave.hide(() => {
                buttons.host.show();
                buttons.join.show();
                battle.deactivate();
            });
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

    buttons.close_hosts = new Button(
        $('button[name="close-hosts"]'),
        () => true,
        () => {
            close_host_list();
            buttons.host.show();
            buttons.join.show();
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );
}


function player_name() {
    return $('#player-name').val();
}

function hide_player_name_input() {
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
