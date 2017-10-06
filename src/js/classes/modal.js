import * as communications from '../communications';


class Modal {
    constructor($modal, config) {
        this._$modal = $modal;
        this._cfg = config;
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
        this._msg_container = this._$modal.find('p');
    }

    open(error_msg) {
        this._msg_container.html('<strong>'+error_msg+'</strong>');
        super._open();
    }
}


export class HostModal extends Modal {
    constructor($modal, config, join_cb, close_cb) {
        super($modal, config);
        this._join_cb = join_cb;
        this._close_cb = close_cb;

        this._$list_container = $modal.find('ul');
        this._$host_search = $modal.find('input[name="host-search"]');
        this._$random_join = $modal.find('button[name="join-random"]');
        this._$refresh = $modal.find('button[name="refresh-hosts"]');
        this._$close = $modal.find('button[name="close-hosts"]');

        this._text_li_class = 'list-group-item text-center';
        this._host_li_class = 'list-group-item d-flex ' +
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
        this._$random_join.click(() => this._join_random_host());
        this._$refresh.click(() => this._refresh());
        this._$close.click(() => this._close());

        $modal.on('hidden.bs.modal', () => this._set_default_state());

        this._set_default_state();
    }

    open() {
        super._open();
        communications.request_hosts(
            (hosts) => {
                this._set_hosts(hosts);
                this._set_join_helpers(true);
            },
            () => this._set_text(this._$list_empty_text)
        );
    }

    _close() {
        communications.cancel_request();
        super._close();
        this._close_cb();
    }

    _refresh() {
        communications.cancel_request();
        this._set_text(this._$loading_text);

        communications.request_hosts(
            (hosts) => {
                this._set_hosts(hosts);
                this._set_join_helpers(true);
            },
            () => {
                this._set_text(this._$list_empty_text);
                this._set_join_helpers(false);
            }
        );
    }

    _set_hosts(hosts) {
        this._clear_list();

        for(const host of hosts) {
            const $join_btn = this._$join_btn
            .clone()
            .data('host', host)
            .click(() => this._join_host($join_btn));

            this._$host_entry
            .clone()
            .append('<span>'+host.name+'</span>')
            .append($join_btn)
            .appendTo(this._$list_container);
        }
    }

    _join_host($clicked_btn) {
        super._close();
        this._join_cb($clicked_btn.data('host'));
    }

    _join_random_host() {
        const $join_buttons = this._$list_container.find('button');
        this._join_host(
            $(
                $join_buttons.get(
                    Math.floor(Math.random() * $join_buttons.length)
                )
            )
        );
    }

    _set_default_state() {
        this._set_text(this._$loading_text);
        this._set_join_helpers(false);
    }

    _set_text($text_as_li) {
        this._clear_list();
        this._$list_container.append($text_as_li);
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

    _clear_list() {
        this._$list_container.empty();
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
