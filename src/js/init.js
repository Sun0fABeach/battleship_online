import * as ship_placement from './ship_placement';
import * as battle from './battle';
import Button from './classes/button';
import Text from './classes/text';


$(document).ready(function() {
    $player_side = $('#player-side');
    $opponent_side = $('#opponent-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');
    const $player_table = $player_side.find('table');
    const $opponent_table = $opponent_side.find('table');

    init_buttons();
    ship_placement.init($player_table);
    ship_placement.activate();
    battle.init($player_table, $opponent_table);
});


let btn_enter, btn_host, btn_join, btn_ready, btn_abort,
    btn_leave, btn_slide, btn_close_hosts;
let $player_side, $opponent_side, $both_sides, $grids_container;


function init_buttons() {
    Button.msg_handler = new Text($('#game-message > span'));

    btn_enter = new Button(
        $('button[name="enter"]'),
        () => player_name(),
        () => {
            hide_player_name_input();
            btn_enter.hide(() => {
                btn_host.show();
                btn_join.show();
            });
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        'Please enter your <strong>name</strong>.'
    );

    btn_host = new Button(
        $('button[name="host"]'),
        () => true,
        () => {
            toggle_dual_grid(true);
            btn_host.hide();
            btn_join.hide(() => {
                btn_abort.show();
                btn_ready.show(); // TODO: don't show until opponent joined
            });
        },
        'Waiting for an opponent to join ...',
        undefined
    );

    btn_join = new Button(
        $('button[name="join"]'),
        () => true,
        () => {
            hide_player_name_input();
            btn_host.hide();
            btn_join.hide();
            open_host_list();
        },
        'Choose a host.',
        undefined
    );

    btn_abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => {
            toggle_dual_grid(false);
            btn_abort.hide();
            btn_ready.hide(() => {
                btn_host.show();
                btn_join.show();
            });
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    btn_ready = new Button(
        $('button[name="ready"]'),
        () => ship_placement.is_valid(),
        () => {
            const ships = ship_placement.deactivate();

            btn_abort.hide();
            btn_ready.hide(() => {
                btn_slide.show();
                btn_leave.show();
                battle.activate(ships);
            });
        },
        'Commencing battle!',
        'You have <strong>invalid</strong> ship placements.'
    );

    btn_leave = new Button(
        $('button[name="leave"]'),
        () => true,
        () => {
            $player_side.find('.game-grid').slideDown(() => {
                ship_placement.activate();
                toggle_dual_grid(false);
            });

            btn_slide.hide();
            btn_leave.hide(() => {
                btn_host.show();
                btn_join.show();
                battle.deactivate();
            });
        },
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    btn_slide = new Button(
        $('button[name="slide"]'),
        () => true,
        () => $player_side.find('.game-grid').slideToggle(),
        undefined,
        undefined
    );

    btn_close_hosts = new Button(
        $('button[name="close-hosts"]'),
        () => true,
        () => {
            close_host_list();
            btn_host.show();
            btn_join.show();
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
    if($(window).width() >= 768) { // hard-coded bootstrap md-breakpoint
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
