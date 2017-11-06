import Text from './text';
import { text } from '../ui';
import { swap_in_socket_handlers, trigger_resize } from '../helpers';


class Modal {
    constructor($modal, config) {
        this._$modal = $modal;
        this._cfg = config;
        $modal.on('hidden.bs.modal', trigger_resize);
    }

    _open() {
        this._$modal.modal(this._cfg);
    }

    _close() {
        this._$modal.modal('hide');
    }
}


export class ErrorModal extends Modal {
    constructor($modal, config) {
        super($modal, config);
        this._$msg_container = this._$modal.find('p');
    }

    open(error_msg) {
        this._$msg_container.html(error_msg);
        super._open();
    }
}


export class HostModal extends Modal {
    constructor($modal, config, socket, join_cb, close_cb) {
        super($modal, config);
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


export class GameOverModal extends Modal {
    constructor($modal, config, socket, yes_regame_cb, no_regame_cb) {
        super($modal, config);
        this._socket = socket;
        this._yes_regame_cb = yes_regame_cb;
        this._no_regame_cb = no_regame_cb;
        this._msg = new Text(this._$modal.find('p'));
        this._$regame_yes = $modal.find('button[name="regame-yes"]');
        this._$regame_no = $modal.find('button[name="regame-no"]');
        this._$regame_abort = $modal.find('button[name="regame-abort"]');
        this._$regame_ok = $modal.find('button[name="regame-ok"]');
        this._opp_wants_regame = false;
        this._player_wants_regame = false;
    }

    open(victory) {
        const msg = victory ? 'You <strong>win</strong>! ' :
                                'You have been <strong>defeated</strong>! ';
        this._msg.set_text(msg + 'Do you want a regame?');
        this._$regame_yes.off().one('click', () => this._regame_yes_handler());
        this._$regame_no.off().one('click', () => this._regame_no_handler());
        this._$regame_abort.off().one('click', () => this._regame_no_handler());
        this._$regame_ok.off().one('click', () => this._regame_no_ok_handler());
        this._$regame_abort.hide();
        this._$regame_ok.hide();
        this._$regame_yes.show();
        this._$regame_no.show();
        this._opp_wants_regame = false;
        this._player_wants_regame = false;

        swap_in_socket_handlers(this._socket, socket => {
            this._register_opponent_regame_handler(socket);
            this._register_opponent_abort_handler(socket);
        });

        super._open();
    }

    close() {
        this._socket.off('wants regame');
        super._close();
    }

    set_regame_decision_handlers(yes_regame_cb, no_regame_cb) {
        this._yes_regame_cb = yes_regame_cb;
        this._no_regame_cb = no_regame_cb;
    }

    _regame_no_handler() {
        this._socket.emit('abort');
        this.close();
        this._no_regame_cb();
    }

    _regame_no_ok_handler() {
        this.close();
        this._no_regame_cb();
    }

    _regame_yes_handler() {
        this._socket.emit('wants regame');

        if(this._opp_wants_regame) {
            this.close();
            this._yes_regame_cb();
        } else {
            this._msg.set_text(
                'Waiting for answer of <strong>' +
                text.opponent_name.text +
                '</strong> ...'
            );
            this._$regame_yes.hide();
            this._$regame_no.hide();
            this._$regame_abort.show();
            this._player_wants_regame = true;
        }
    }

    _register_opponent_regame_handler(socket) {
        socket.on('wants regame', () => {
            if(this._player_wants_regame) {
                this.close();
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

    _register_opponent_abort_handler(socket) {
        socket.on('opponent aborted', () => {
            this._msg.set_text(
                '<strong>' + text.opponent_name.text + '</strong> ' +
                "doesn't want a regame."
            );
            this._$regame_yes.hide();
            this._$regame_no.hide();
            this._$regame_abort.hide();
            this._$regame_ok.show();
        });
    }
}
