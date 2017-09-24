import * as ship_placement from './ship_placement';
import Button from './button';

let btn_host, btn_join, btn_ready, btn_abort, btn_slide;


$(document).ready(function() {
    init_buttons();
    ship_placement.init();
});


function init_buttons() {
    btn_host = new Button(
        $('button[name="host"]'),
        () => player_name(),
        () => switch_to_dual_view(),
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

    btn_ready = new Button(
        $('button[name="ready"]'),
        () => valid_ship_placement(),
        () => {
            btn_abort.hide();
            btn_ready.hide(() => {
                // TODO: delay this until game start:
                btn_slide.show();
                btn_abort.show();
                set_crosshair(true);
            });
        },
        'Waiting for opponent to finish ship placement ...',
        'You have <strong>invalid</strong> ship placements.'
    );

    btn_abort = new Button(
        $('button[name="abort"]'),
        () => true,
        () => switch_to_game_left_view(),
        'Choose <strong>Host</strong> to host a game, ' +
        'or <strong>Join</strong> to join a hosted game.',
        undefined
    );

    btn_slide = new Button(
        $('button[name="slide"]'),
        () => true,
        () => $('#player-side .game-grid').slideToggle(),
        undefined,
        undefined
    );
}


function player_name() {
    return $('#player-name').val();
}

function switch_to_dual_view() {
    $('#game-controls .form-group').fadeOut(function() {
        // need to remove bootstrap class in order to be able to hide
        $(this).removeClass('d-flex');
    });

    btn_host.hide();
    btn_join.hide(() => {
        btn_abort.show();
        btn_ready.show();
        $('#opponent-side, #player-side').addClass('dual-view');
    });
}

function switch_to_game_left_view() {
    btn_ready.hide();
    btn_slide.hide();
    btn_abort.hide(() => {
        btn_host.show();
        btn_join.show();
        $('#opponent-side, #player-side').removeClass('dual-view');
        set_crosshair(false);
    });
}

function valid_ship_placement() {
    return $('#player-side').find('.over, .forbidden').length === 0;
}

function set_crosshair(active) {
    $('#opponent-side table').css('cursor', active ? 'crosshair' : '');
}
