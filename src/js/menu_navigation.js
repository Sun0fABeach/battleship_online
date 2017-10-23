import * as ship_placement from './ship_placement';
import * as battle from './battle';
import * as ui from './ui';
import { adjacent_grid_mode, swap_in_socket_handlers } from './helpers';


export function init(socket) {
    init_modal_handlers(socket);
    init_menu_button_handlers(socket);
}

function init_modal_handlers(socket) {
    ui.modals.host_list.set_completion_handlers(
        (host_name) => {
            animate_toggle_dual_grid(true);
            ui.text.opponent_name.change(host_name);
            const msg = ui.msg.connected;
            ui.text.game_msg.change(
                msg[0] + host_name + msg[1] + ' ' + ui.msg.finish_placement
            );
            swap_in_menu_buttons(['abort', 'ready']);

            swap_in_socket_handlers(socket, () =>
                register_abort_handler(socket, false)
            );
        },
        () => {
            ui.text.game_msg.change(ui.msg.host_or_join);
            swap_in_menu_buttons(['host', 'open_hosts']);
            swap_in_socket_handlers(socket, null);
        }
    );

    ui.modals.game_over.set_regame_decision_handlers(
        () => {
            ui.grids.$container.fadeOut(() => {
                battle.deactivate();
                player_grid_instant_show();
                ship_placement.activate();
                ui.grids.$container.fadeIn();
            });
            ui.text.game_msg.change(ui.msg.finish_placement);
            swap_in_menu_buttons(['abort', 'ready']);
            swap_in_socket_handlers(socket, () =>
                register_abort_handler(socket, false)
            );
        },
        () => end_battle(socket)
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
                    swap_in_menu_buttons(['host', 'open_hosts']);
                    ui.text.player_name.change(player_name);
                    ui.text.game_msg.change(ui.msg.host_or_join);
                } else {
                    ui.menu_buttons.enter.invalid();
                    ui.menu_buttons.enter.clickable(true);
                    ui.text.game_msg.change(ui.msg.name_taken);
                }
            });
        } else {
            ui.input.$name.focus();
            ui.menu_buttons.enter.invalid();
            ui.input.$name.one('input', () => ui.menu_buttons.enter.normal());
            ui.text.game_msg.change(ui.msg.name_enter);
        }
    });


    ui.menu_buttons.host.click(() => {
        ui.menu_buttons.host.clickable(false);
        ui.menu_buttons.open_hosts.clickable(false);

        socket.emit('host', (success, fail_reason) => {
            if(success) {
                animate_toggle_dual_grid(true);
                swap_in_menu_buttons(['abort']);
                ui.text.game_msg.change(ui.msg.wait_for_join);
            } else {
                ui.menu_buttons.host.clickable(true);
                ui.menu_buttons.open_hosts.clickable(true);
                ui.modals.error.open('Failed to host: ' + fail_reason);
            }
        });

        swap_in_socket_handlers(socket, () => {
        socket.on('opponent entered', (opponent_name) => {
            swap_in_menu_buttons(['abort', 'ready']);
            ui.text.opponent_name.change(opponent_name);
            const msg = ui.msg.opponent_joined;
            ui.text.game_msg.change(
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
        swap_in_menu_buttons(null);
        ui.text.game_msg.change(ui.msg.choose_host);
    });


    ui.menu_buttons.abort.click(() => {
        socket.emit('abort');
        go_to_lobby(socket);
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
                start_battle(socket, false);
            } else {
                swap_in_menu_buttons(['abort']);
                const msg = ui.msg.placement_wait;
                ui.text.game_msg.change(
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


    ui.menu_buttons.give_up.click(() => {
        socket.emit('abort');
        end_battle(socket);
    });


    ui.menu_buttons.slide.click(
        () => ui.grids.player.slideToggle()
    );
}


function swap_in_menu_buttons(to_show) {
    let show_triggered = false;

    for(const button of Object.values(ui.menu_buttons)) {
        if(button.is_visible()) {
            if(!show_triggered) {
                button.hide(() => show_menu_buttons(to_show));
                show_triggered = true;
            } else {
                button.hide();
            }
        }
    }

    // if no button was there to hide, we still need to trigger this
    if(!show_triggered)
        show_menu_buttons(to_show);
}

function show_menu_buttons(buttons_to_show) {
    if(buttons_to_show)
        buttons_to_show.forEach(name => ui.menu_buttons[name].show());
}

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

function animate_toggle_dual_grid(active, fadeout_cb) {
    ui.grids.$container.fadeOut(() => {
        if(fadeout_cb)
            fadeout_cb();
        toggle_dual_grid(active);
        ui.grids.$container.fadeIn();
    });
}

function toggle_dual_grid(active) {
    if(active)
        ui.grids.$both.addClass('dual-view');
    else
        ui.grids.$both.removeClass('dual-view');
}

function go_to_lobby(socket, fadeout_cb) {
    ui.text.opponent_name.change('Opponent');
    ui.text.game_msg.change(ui.msg.host_or_join);
    swap_in_menu_buttons(['host', 'open_hosts']);
    animate_toggle_dual_grid(false, fadeout_cb);
    swap_in_socket_handlers(socket, null);
}

function end_battle(socket) {
    go_to_lobby(socket, () => {
        battle.deactivate();
        ship_placement.activate();
        player_grid_instant_show();
    });
}

function start_battle(socket, player_begins) {
    swap_in_menu_buttons(['slide', 'give_up']);

    if(player_begins) {
        ui.text.game_msg.change(
            ui.msg.battle_start + ' ' + ui.msg.player_begins
        );
    } else {
        const msg = ui.msg.opponent_begins;
        ui.text.game_msg.change(
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

function player_grid_instant_show() {
    if(ui.grids.player.slid_up) {
        ui.grids.player.show(); // instant show here, so we have to
        ui.grids.player.slid_up = false; // manually set the slid up state
    }
}

function register_abort_handler(socket, in_battle) {
    socket.on('opponent aborted', () => {
        ui.modals.error.open(
            ui.text.opponent_name.text + ' has left the game.'
        );
        if(in_battle)
            end_battle(socket);
        else
            go_to_lobby(socket);
    });
}

$(window).resize(function() {
    if(ui.grids.player.slid_up) {
        if(adjacent_grid_mode())
            ui.grids.player.show();
        else
            ui.grids.player.hide();
    }
});
