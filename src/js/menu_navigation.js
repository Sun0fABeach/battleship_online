import * as ship_placement from './ship_placement';
import * as battle from './battle';
import * as ui from './ui';
import {
    adjacent_grid_mode,
    swap_in_socket_handlers
} from './helpers';


export function init(socket) {
    init_modal_handlers(socket);
    init_menu_button_handlers(socket);
}

function init_modal_handlers(socket) {

    ui.modals.host_list.set_completion_handlers(
        (host_name) => {
            animate_toggle_dual_grid(true);
            ui.text.opponent_name.fade_swap(host_name, true);
            const msg = ui.msg.connected;
            ui.text.game_msg.fade_swap(
                msg[0] + host_name + msg[1] + ' ' + ui.msg.finish_placement
            );
            host_list_close_update_ctrl_pane('abort', 'ready');
            swap_in_socket_handlers(socket, () =>
                register_abort_handler(socket, false)
            );
        },
        () => {
            ui.text.game_msg.fade_swap(ui.msg.host_or_join);
            host_list_close_update_ctrl_pane('host', 'open_hosts');
            swap_in_socket_handlers(socket, null);
        }
    );

    function host_list_close_update_ctrl_pane(...btns_to_show) {
        ui.footer.fadeOut(() => {
            for(const btn_name of btns_to_show)
                ui.menu_buttons[btn_name].show();
            ui.footer.fadeIn();
        });
    }

    ui.modals.give_up.set_confirmation_handler(() => {
        socket.emit('abort');
        end_battle_back_to_lobby(socket);
    });

    ui.modals.game_over.set_regame_decision_handlers(
        () => {
            battle.deactivate();
            ui.grids.$container.fadeOut(() => {
                battle.clear_grids();
                ui.grids.player.show(true);
                ui.grids.$container.fadeIn(() =>
                    ship_placement.activate()
                );
            });
            ui.text.game_msg.fade_swap(ui.msg.finish_placement);
            swap_in_menu_buttons('abort', 'ready');
            swap_in_socket_handlers(socket, () =>
                register_abort_handler(socket, false)
            );
        },
        () => end_battle_back_to_lobby(socket)
    );
}

function init_menu_button_handlers(socket) {
    ui.menu_buttons.enter.click(() => {

        if(validate_player_name()) {
            const player_name = get_player_name();
            ui.menu_buttons.enter.clickable(false);

            socket.emit('name register', player_name, (success) => {
                if(success) {
                    ui.input.$name.fadeOut();
                    swap_in_menu_buttons('host', 'open_hosts');
                    ui.text.player_name.fade_swap(player_name, true);
                    ui.text.game_msg.fade_swap(ui.msg.host_or_join);
                } else {
                    ui.menu_buttons.enter.invalid();
                    ui.menu_buttons.enter.clickable(true);
                    ui.text.game_msg.fade_swap(ui.msg.name_taken);
                }
            });
        } else {
            ui.input.$name.focus();
            ui.menu_buttons.enter.invalid();
            ui.input.$name.one('input', () => ui.menu_buttons.enter.normal());
            ui.text.game_msg.fade_swap(ui.msg.name_enter);
        }
    });

    function validate_player_name() {
        if(get_player_name() === '') {
            ui.input.$name.val('');
            return false;
        }
        return true;
    }

    function get_player_name() {
        return ui.input.$name.val().trim();
    }

    ui.menu_buttons.host.click(() => {
        ui.menu_buttons.host.clickable(false);
        ui.menu_buttons.open_hosts.clickable(false);

        socket.emit('host', (success, fail_reason) => {
            if(success) {
                animate_toggle_dual_grid(true);
                swap_in_menu_buttons('abort');
                ui.text.game_msg.fade_swap(ui.msg.wait_for_join);
            } else {
                ui.menu_buttons.host.clickable(true);
                ui.menu_buttons.open_hosts.clickable(true);
                ui.modals.error.open('Failed to host: ' + fail_reason);
            }
        });

        swap_in_socket_handlers(socket, () => {
        socket.on('opponent entered', (opponent_name) => {
            swap_in_menu_buttons('abort', 'ready');
            ui.text.opponent_name.fade_swap(opponent_name, true);
            const msg = ui.msg.opponent_joined;
            ui.text.game_msg.fade_swap(
                msg[0] + opponent_name + msg[1] + ' ' +
                ui.msg.finish_placement
            );
            swap_in_socket_handlers(socket, () =>
                register_abort_handler(socket, false)
            );
        });
        });
    });

    ui.menu_buttons.open_hosts.click(() => {
        ui.modals.host_list.open();
        swap_in_menu_buttons();
        ui.text.game_msg.fade_swap(ui.msg.choose_host);
    });


    ui.menu_buttons.abort.click(() => {
        socket.emit('abort');
        go_to_lobby(socket);
    });


    ui.menu_buttons.ready.click(() => {
        if(!ship_placement.is_valid()) {
            ui.menu_buttons.ready.invalid();
            ui.text.game_msg.fade_swap(ui.msg.invalid_placement);
            return;
        }

        ship_placement.deactivate();
        ui.menu_buttons.ready.clickable(false);

        socket.emit('ready', (other_ready) => {
            if(other_ready) {
                start_battle(socket, false);
            } else {
                swap_in_menu_buttons('abort');
                const msg = ui.msg.placement_wait;
                ui.text.game_msg.fade_swap(
                    msg[0] + ui.text.opponent_name.text + msg[1]
                );

                swap_in_socket_handlers(socket, () => {
                    socket.on('opponent ready', () => {
                        start_battle(socket, true);
                    });
                    register_abort_handler(socket, false);
                });
            }
        });
    });

    ui.menu_buttons.give_up.click(() => ui.modals.give_up.open());
    ui.menu_buttons.slide.click(() => ui.grids.player.slideToggle());
}


function swap_in_menu_buttons(...to_show) {
    // fade out+in footer to have a smooth change of its vertical position
    ui.footer.fadeOut(() => ui.footer.fadeIn());

    let show_triggered = false;

    for(const btn_name of Object.keys(ui.menu_buttons)) {
        const button = ui.menu_buttons[btn_name];
        if(button.is_visible()) {
            if(!show_triggered) {
                /* jshint ignore:start */
                button.hide(() => show_menu_buttons(to_show));
                /* jshint ignore:end */
                show_triggered = true;
            } else {
                button.hide();
            }
        }
    }

    // if no button was there to hide, we still need to trigger this
    if(!show_triggered)
        show_menu_buttons(to_show);

    function show_menu_buttons(buttons_to_show) {
        if(buttons_to_show)
            buttons_to_show.forEach(name => ui.menu_buttons[name].show());
    }
}

function animate_toggle_dual_grid(active, fadeout_cb, fadein_cb) {
    ui.grids.$container.fadeOut(() => {
        if(fadeout_cb)
            fadeout_cb();
        toggle_dual_grid(active);
        ui.grids.$container.fadeIn(() => {
            if(fadein_cb)
                fadein_cb();
        });
    });

    function toggle_dual_grid(active) {
        if(active)
            ui.grids.$both.addClass('dual-view');
        else
            ui.grids.$both.removeClass('dual-view');
    }
}

function go_to_lobby(socket, fadeout_cb) {
    ui.text.opponent_name.fade_swap('Opponent');
    ui.text.game_msg.fade_swap(ui.msg.host_or_join);
    swap_in_menu_buttons('host', 'open_hosts');
    animate_toggle_dual_grid(false, fadeout_cb, () => {
        if(!ship_placement.is_active())
            ship_placement.activate();
    });
    swap_in_socket_handlers(socket, null);
}

function end_battle_back_to_lobby(socket) {
    battle.deactivate();
    go_to_lobby(socket,
        () => {
            battle.clear_grids();
            ui.grids.player.show(true);
        }
    );
}

function start_battle(socket, player_begins) {
    swap_in_menu_buttons('slide', 'give_up');

    if(player_begins) {
        ui.text.game_msg.fade_swap(
            ui.msg.battle_start + ' ' + ui.msg.player_begins
        );
    } else {
        const msg = ui.msg.opponent_begins;
        ui.text.game_msg.fade_swap(
            ui.msg.battle_start + ' ' +
            msg[0] + ui.text.opponent_name.text + msg[1]
        );
    }

    swap_in_socket_handlers(socket, () =>
        register_abort_handler(socket, true)
    );
    // activate after swapping socket handlers so battle doesn't get its own
    // handlers overwritten
    battle.activate(player_begins);
}

function register_abort_handler(socket, in_battle) {
    socket.on('opponent aborted', () => {
        if(ui.modals.give_up.is_open())
            ui.modals.give_up.close(abort_action);
        else
            abort_action();
    });

    function abort_action() {
        ui.modals.error.open(
            '<strong>' + ui.text.opponent_name.text +
            '</strong> has left the game.'
        );
        if(in_battle)
            end_battle_back_to_lobby(socket);
        else
            go_to_lobby(socket);
    }
}

$(window).resize(function() {
    if(adjacent_grid_mode())
        ui.grids.player.show(true, false);
    else
        ui.grids.player.show_from_state();
});
