import * as ship_placement from './ship_placement';
import * as battle from './battle';
import * as ui from './ui';
import { grids_are_adjacent } from './helpers';


let $player_side, $both_sides, $grids_container;
let $name_input;
let player_name, opponent_name;


export function init(socket) {
    $player_side = $('#player-side');
    $both_sides = $('.grid-wrapper');
    $grids_container = $('#grids-container');
    $name_input = $('#player-name');

    init_modal_handlers();
    init_menu_button_handlers(socket);
}


function init_modal_handlers() {
    ui.modals.host_list.set_completion_handlers(
        (host_name) => {
            opponent_name = host_name;
            toggle_dual_grid(true);
            ui.text.opponent_name.change(host_name);
            const msg = ui.msg.connected;
            ui.text.game_msg.change(
                msg[0] + host_name + msg[1] + ' ' + ui.msg.finish_placement
            );
            show_menu_buttons(['abort', 'ready']);
        },
        () => {
            ui.text.game_msg.change(ui.msg.host_or_join);
            show_menu_buttons(['host', 'open_hosts']);
        }
    );
}


function init_menu_button_handlers(socket) {
    ui.menu_buttons.enter.click(() => {
        if(!validate_player_name()) {
            $name_input.focus();
            ui.menu_buttons.enter.invalid();
            $name_input.one('input', () => ui.menu_buttons.enter.normal());
            ui.text.game_msg.change(ui.msg.name_enter);
        } else {
            player_name = get_player_name();
            ui.menu_buttons.enter.clickable(false);

            socket.emit('name register', player_name, (success) => {
                if(success) {
                    $name_input.fadeOut();
                    show_menu_buttons(['host', 'open_hosts']);
                    ui.text.player_name.change(player_name);
                    ui.text.game_msg.change(ui.msg.host_or_join);
                } else {
                    ui.menu_buttons.enter.invalid();
                    ui.menu_buttons.enter.clickable(true);
                    ui.text.game_msg.change(ui.msg.name_taken);
                }
            });
        }
    });

    $('#main-menu form').on('submit', ui.menu_buttons.enter.click);


    ui.menu_buttons.host.click(() => {
        ui.menu_buttons.host.clickable(false);
        ui.menu_buttons.open_hosts.clickable(false);

        socket.emit('host', (success, fail_reason) => {
            if(success) {
                toggle_dual_grid(true);
                show_menu_buttons(['abort']);
                ui.text.game_msg.change(ui.msg.wait_for_join);
            } else {
                ui.menu_buttons.host.clickable(true);
                ui.menu_buttons.open_hosts.clickable(true);
                ui.modals.error.open('Failed to host: ' + fail_reason);
            }
        });
    });

    socket.on('opponent entered', (opponent) => {
        opponent_name = opponent;
        show_menu_buttons(['abort', 'ready']);
        ui.text.opponent_name.change(opponent_name);
        const msg = ui.msg.opponent_joined;
        ui.text.game_msg.change(
            msg[0] + opponent_name + msg[1] + ' ' + ui.msg.finish_placement
        );
    });


    ui.menu_buttons.open_hosts.click(() => {
        ui.modals.host_list.open(player_name);
        show_menu_buttons(null);
        ui.text.game_msg.change(ui.msg.choose_host);
    });


    ui.menu_buttons.abort.click(() => {
        socket.emit('abort');
        toggle_dual_grid(false);
        show_menu_buttons(['host', 'open_hosts']);
        ui.text.opponent_name.change('Opponent');
        ui.text.game_msg.change(ui.msg.host_or_join);
    });

    socket.on('opponent aborted', () => {
        /* rare corner case: player clicked abort, grid is made single and
           shortly afterwards, this event arrives b/c opponent aborted or
           disconnected at the same time. */
        if(!is_dual_grid())
            return;
        ui.modals.error.open(opponent_name + ' has left the game.');
        toggle_dual_grid(false);
        show_menu_buttons(['host', 'open_hosts']);
        ui.text.opponent_name.change('Opponent');
        ui.text.game_msg.change(ui.msg.host_or_join);
    });


    ui.menu_buttons.ready.click(() => {
        if(!ship_placement.is_valid()) {
            ui.menu_buttons.ready.invalid();
            ui.text.game_msg.change(ui.msg.invalid_placement);
            return;
        }

        ship_placement.deactivate();
        ui.menu_buttons.ready.clickable(false);

        socket.emit('ready', (other_ready) => {
            if(other_ready) {
                start_battle(false);
            } else {
                show_menu_buttons(['abort']);
                const msg = ui.msg.placement_wait;
                ui.text.game_msg.change(
                    msg[0] + opponent_name + msg[1]
                );
            }
        });
    });

    socket.on('opponent ready', () => start_battle(true));


    ui.menu_buttons.give_up.click(() => {
        socket.emit('give up');
        end_battle();
    });

    socket.on('opponent gave up', () => {
        /* rare corner case: player gave up, grid is made single and
           shortly afterwards, this event arrives b/c opponent gave up or
           disconnected at the same time. */
        if(!is_dual_grid())
            return;
        ui.modals.error.open(opponent_name + ' has left the game.');
        end_battle();
    });


    ui.menu_buttons.slide.click(
        () => ui.grids.player.slideToggle()
    );
}


function show_menu_buttons(to_show, callback) {
    let cb_registered = false;

    for(const button of Object.values(ui.menu_buttons)) {
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

function show_menu_buttons_do_action(buttons_to_show, action) {
    if(buttons_to_show)
        buttons_to_show.forEach(name => ui.menu_buttons[name].show());
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
    if(grids_are_adjacent()) {
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

function start_battle(player_begins) {
    battle.activate(player_begins);
    show_menu_buttons(['slide', 'give_up']);

    if(player_begins) {
        ui.text.game_msg.change(
            ui.msg.battle_start + ' ' + ui.msg.player_begins
        );
    } else {
        const msg = ui.msg.opponent_begins;
        ui.text.game_msg.change(
            ui.msg.battle_start + ' ' + msg[0] + opponent_name + msg[1]
        );
    }
}

function end_battle() {
    ui.grids.player.slideDown(() => {
        ship_placement.activate();
        toggle_dual_grid(false);
    });
    show_menu_buttons(['host', 'open_hosts'], battle.deactivate);
    ui.text.opponent_name.change('Opponent');
    ui.text.game_msg.change(ui.msg.host_or_join);
}

$(window).resize(function() {
    if(ui.grids.player.slid_up) {
        if(grids_are_adjacent())
            ui.grids.player.show();
        else
            ui.grids.player.hide();
    }
});
