/** Module containing modal class definitions.
    @module classes/modal
*/

import Text from './text';
import { text } from '../ui';
import { swap_in_socket_handlers } from '../helpers';


/** Class representing a Bootstrap modal.
    @abstract
*/
class Modal {
    constructor($modal, config) {
        this._$modal = $modal;
        this._cfg = config;
        this._open = false;
    }

    is_open() {
        return this._open;
    }

    _open() {
        /* dispose previous config b/c underlying HTML modal element might be
           reused. previous configs are not overwritten automatically. */
        this._$modal.modal('dispose').modal(this._cfg);
        this._open = true;
    }

    _close() {
        this._$modal.modal('hide');
        this._open = false;
    }
}

/** Modal that requires some sort of reaction by the user.
    @abstract
*/
class BasicInteractionModal extends Modal {
    constructor($modal, config) {
        super($modal, config);
        this._$head_container = this._$modal.find('.modal-header');
        this._heading = new Text(
            this._$head_container.children('.modal-title')
        );
        this._msg = new Text(
            this._$modal.find('.modal-body').children().eq(0)
        );
        this._$btn_left = $modal.find('button[name="left"]');
        this._$btn_right = $modal.find('button[name="right"]');
    }
}

/** Modal that informs the user about something. */
export class AcknowledgeModal extends BasicInteractionModal {
    /**
     * Create a AcknowledgeModal instance.
     * @param {jQuery} $modal -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  Bootstrap modal element to be handled.
     */
    constructor($modal) {
        super($modal, 'show');
    }

    open(msg) {
        this._$head_container.hide();
        this._msg.set_text(msg);
        this._$btn_left.hide();
        this._$btn_right
        .off()
        .one('click', () => this._close())
        .text('OK')
        .show();

        super._open();
    }
}

/** Modal that asks the user if she really wants to leave. */
export class LeaveConfirmModal extends BasicInteractionModal {
    /**
     * Create a LeaveConfirmModal instance.
     * @param {jQuery} $modal -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  Bootstrap modal element to be handled.
     * @param {Function} confirm_cb - action to perform when leaving game.
     */
    constructor($modal, confirm_cb) {
        super($modal, {
            backdrop: 'static',
            keyboard: false
        });
        this._confirm_cb = confirm_cb;
    }

    open() {
        this._$head_container.hide();

        this._$btn_left
        .off()
        .one('click', () => {
            if(this._confirm_cb)
                this._confirm_cb();
            this.close();
        })
        .text('Yes')
        .show();

        this._$btn_right
        .off()
        .one('click', () => this.close())
        .text('No')
        .show();

        super._open();
    }

    close(close_cb) {
        if(close_cb)
            this._$modal.one('hidden.bs.modal', () => close_cb());
        super._close();
    }

    set_message(new_msg) {
        this._msg.set_text(new_msg);
        return this;
    }

    set_confirmation_handler(confirm_cb) {
        this._confirm_cb = confirm_cb;
        return this;
    }
}

/** Modal that asks the user for a regame. */
export class GameOverModal extends BasicInteractionModal {
    /**
     * Create a GameOverModal instance.
     * @param {jQuery} $modal -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  Bootstrap modal element to be handled.
     * @param {io.Socket} socket -
     *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
     * @param {Function} yes_regame_cb -
     *  action to perform when player decides to have a regame.
     * @param {Function} no_regame_cb -
     *  action to perform when player doesn't want a regame.
     */
    constructor($modal, socket, yes_regame_cb, no_regame_cb) {
        super($modal, {
            backdrop: 'static',
            keyboard: false
        });
        this._socket = socket;
        this._yes_regame_cb = yes_regame_cb;
        this._no_regame_cb = no_regame_cb;
        this._opp_wants_regame = false;
        this._player_wants_regame = false;
    }

    open(opponent, victory) {
        this._$head_container.show();
        this._heading.set_text(victory ? 'You <strong>win</strong>!' :
                                'You have been <strong>defeated</strong>!');
        this._msg.set_text('Do you want a regame?');
        this._$btn_left.off().one('click', () =>
            this._regame_yes_handler(opponent)
        );
        this._$btn_right.off().one('click', () =>
            this._regame_no_handler(opponent)
        );
        this._$btn_left.text('Yes').show();
        this._$btn_right.text('No').show();
        this._opp_wants_regame = false;
        this._player_wants_regame = false;

        swap_in_socket_handlers(this._socket, () => {
            this._register_opponent_regame_handler(opponent);
            this._register_opponent_abort_handler(opponent);
        });

        super._open();
    }

    set_regame_decision_handlers(yes_regame_cb, no_regame_cb) {
        this._yes_regame_cb = yes_regame_cb;
        this._no_regame_cb = no_regame_cb;
    }

    _regame_no_handler(opponent) {
        opponent.tell_abort();
        super._close();
        this._no_regame_cb();
    }

    _regame_no_ok_handler() {
        super._close();
        this._no_regame_cb();
    }

    _regame_yes_handler(opponent) {
        opponent.tell_regame();

        if(this._opp_wants_regame) {
            super._close();
            this._yes_regame_cb();
        } else {
            this._msg.set_text(
                'Waiting for answer of <strong>' +
                text.opponent_name.text +
                '</strong> ...'
            );
            this._$btn_left.hide();
            this._$btn_right.text('Abort');
            this._player_wants_regame = true;
        }
    }

    _register_opponent_regame_handler(opponent) {
        opponent.set_regame_handler(() => {
            if(this._player_wants_regame) {
                super._close();
                this._yes_regame_cb();
            } else {
                this._msg.set_text(
                    '<strong>' + text.opponent_name.text + '</strong> ' +
                    " wants a regame!"
                );
                this._opp_wants_regame = true;
            }
        });
    }

    _register_opponent_abort_handler(opponent) {
        opponent.set_abort_handler(() => {
            this._msg.set_text(
                '<strong>' + text.opponent_name.text + '</strong> ' +
                "doesn't want a regame."
            );
            this._$btn_left.hide();
            this._$btn_right
            .off()
            .one('click', () => this._regame_no_ok_handler())
            .text('OK');
        });
    }
}

/** Modal that lists the current hosts and lets the user join them. */
export class HostModal extends Modal {
    /**
     * Create a HostModal instance.
     * @param {jQuery} $modal -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  Bootstrap modal element to be handled.
     * @param {io.Socket} socket -
     *  [Socket.io]{@link https://socket.io/docs/client-api/#socket} connection.
     * @param {Function} join_cb -
     *  action to perform when player joins a game.
     * @param {Function} close_cb -
     *  action to perform when player closes the modal.
     */
    constructor($modal, socket, join_cb, close_cb) {
        super($modal, {
            backdrop: 'static',
            keyboard: false
        });
        this._socket = socket;
        this._join_cb = join_cb;
        this._close_cb = close_cb;

        this._$list_container = $modal.find('ul');
        this._$host_search = $modal.find('input[name="host-search"]');
        this._$random_join = $modal.find('button[name="join-random"]');
        this._$close = $modal.find('button[name="close-hosts"]');

        this._text_li_class = 'list-group-item text-center';
        this._host_li_class = 'list-group-item list-group-item-action d-flex ' +
                                'justify-content-between align-items-center';
        this._join_btn_class = 'btn btn-sm btn-info float-right';

        this._$loading_text = $('<li>')
                                .addClass(this._text_li_class)
                                .text('Loading ...');
        this._$list_empty_text = $('<li>')
                                .addClass(this._text_li_class)
                                .text('Currently no hosted games.');
        this._$host_entry = $('<li>')
                            .addClass(this._host_li_class);
        this._$join_btn = $('<button>')
                            .attr({type: 'button', name: 'join'})
                            .addClass(this._join_btn_class)
                            .text('Join');

        this._$host_search.on('input', () => this._handle_search());
        this._$close.click(() => this._close());
        this._join_inputs_enable(true);
    }

    set_completion_handlers(join_cb, close_cb) {
        this._join_cb = join_cb;
        this._close_cb = close_cb;
    }

    open() {
        this._set_default_state();

        super._open();
        this._socket.emit('host watch', (hosts) => {
            this._$loading_text.remove();
            if(hosts) {
                for(const host of hosts)
                    this._add_item(host);
            } else {
                this._$list_container.append(this._$list_empty_text);
            }
        });

        swap_in_socket_handlers(this._socket, (socket) => {
            socket.on('add host', (host) => {
                this._add_item(host);
            });
            socket.on('remove host', (id) => {
                this._remove_item(id);
            });
        });
    }

    _close() {
        this._socket.emit('host unwatch');
        swap_in_socket_handlers(this._socket, null);
        super._close();
        if(this._close_cb)
            this._close_cb();
    }

    _add_item(host) {
        this._$list_empty_text.remove(); // present if adding first item

        if(this._$list_container.find('li').length === 0)
            this._set_join_helpers(true); // list was empty until now

        this._$host_entry
        .clone()
        .append('<span>'+host.name+'</span>')
        .append(this._$join_btn.clone())
        .appendTo(this._$list_container)
        .data('host', host);
    }

    _remove_item(id) {
        const $items = this._$list_container.find('li');

        $items.each((index, item) => {
            if($(item).data('host').id === id) {
                $(item).remove();
                if($items.length === 1) { // was 1 before, is now empty
                    this._$list_container.append(this._$list_empty_text);
                    this._set_join_helpers(false);
                }
                return false;
            }
        });
    }

    _join_host(host) {
        this._join_inputs_enable(false);
        this._$close.off('click');

        this._socket.emit('join', host.id, (success) => {
            this._join_inputs_enable(true);
            this._$close.click(() => this._close());

            if(success) {
                super._close();
                if(this._join_cb)
                    this._join_cb(host.name);
                return;
            }
        });
    }

    _join_random_host() {
        const $host_entries = this._$list_container.find('li');
        this._join_host(
            $(
                $host_entries.get(
                    Math.floor(Math.random() * $host_entries.length)
                )
            ).data('host')
        );
    }

    _join_inputs_enable(active) {
        if(active) {
            const modal = this;
            this._$list_container.on('click', 'li:has(button)', function() {
                modal._join_host($(this).data('host'));
            });
            this._$random_join.click(() => this._join_random_host());
        } else {
            this._$list_container.off('click');
            this._$random_join.off('click');
        }
    }

    _set_default_state() {
        this._$list_container.empty();
        this._$list_container.append(this._$loading_text);
        this._set_join_helpers(false);
    }

    _set_join_helpers(visible) {
        if(visible) {
            this._$host_search.show();
            this._$random_join.show();
        } else {
            this._$host_search.hide().val('');
            this._$random_join.hide();
        }
    }

    _handle_search() {
        const query = this._$host_search.val().trim().toUpperCase();
        const $entries = this._$list_container.find('li');

        if(query.length === 0) {
            this._show_entry($entries); // will show all
            return;
        }

        $entries.each((index, entry) => {
            const $entry = $(entry);
            if(this._extract_hostname($entry).toUpperCase().startsWith(query))
                this._show_entry($entry);
            else
                this._hide_entry($entry);
        });
    }

    _extract_hostname($entry) {
        return $entry.find('span').text();
    }

    _show_entry($entry) {
        $entry.removeClass('d-none').addClass('d-flex');
    }

    _hide_entry($entry) {
        $entry.removeClass('d-flex').addClass('d-none');
    }
}
