import * as ship_placement from './ship_placement';
import Button from './button';


$(document).ready(function() {
    $player_side = $('#player-side');
    $opponent_side = $('#opponent-side');
    init_buttons();
    ship_placement.init();
});


let btn_host, btn_join, btn_ready, btn_abort,
    btn_leave, btn_slide, btn_close_hosts;
let $player_side, $opponent_side;


function init_buttons() {
    btn_host = new Button(
        $('button[name="host"]'),
        () => player_name(),
        () => {
            hide_player_name_input();

            btn_host.hide();
            btn_join.hide(() => {
                btn_abort.show();
                btn_ready.show(); // TODO: don't show until opponent joined
                $player_side.add($opponent_side).addClass('dual-view');
            });
        },
        'Waiting for an opponent to join ...',
        'Please enter your <strong>name</strong>.'
    );

    btn_join = new Button(
        $('button[name="join"]'),
        () => true,
        () => {},
        'Implement me.',
        'Please enter your <strong>name</strong>.'
    );

    btn_abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => {
            btn_abort.hide();
            btn_ready.hide(() => {
                btn_host.show();
                btn_join.show();
                $player_side.add($opponent_side).removeClass('dual-view');
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
            ship_placement.deinit();

            btn_abort.hide();
            btn_ready.hide(() => {
                btn_slide.show();
                btn_leave.show();
                set_crosshair(true);
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
                ship_placement.reinit();
            });

            btn_slide.hide();
            btn_leave.hide(() => {
                btn_host.show();
                btn_join.show();
                $player_side.add($opponent_side).removeClass('dual-view');
                set_crosshair(false);
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
}


function player_name() {
    return $('#player-name').val();
}

function hide_player_name_input() {
    $('#game-controls .form-group').fadeOut(function() {
        // need to remove bootstrap class in order to be able to hide
        $(this).removeClass('d-flex');
    });
}

function set_crosshair(active) {
    $opponent_side.find('table').css('cursor', active ? 'crosshair' : '');
}
