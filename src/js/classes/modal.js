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
    constructor($modal, config, close_cb) {
        super($modal, config);
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

        this._$loading_text = $('<li class="'+this._text_li_class+'">' +
                                'Loading ...</li>');
        this._$list_empty_text = $('<li class="'+this._text_li_class+'">' +
                                'Currently no hosted games.</li>');
        this._$host_entry = $('<li class="'+this._host_li_class+'"></li>');

        this._$join_btn = $('<button type="button" name="join"' +
                            'class="'+this._join_btn_class+'">Join</button>');

        this._$host_search.on('input', () => this._handle_search());
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
            this._$host_entry
            .clone()
            .text(host.name)
            .append(
                this._$join_btn
                .clone()
                .data('host', host)
            )
            .appendTo(this._$list_container);
        }
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
        return $entry.contents().filter((index, element) =>
            element.nodeType === Node.TEXT_NODE
        ).text();
    }

    _show_entry($entry) {
        $entry.removeClass('d-none').addClass('d-flex');
    }

    _hide_entry($entry) {
        $entry.removeClass('d-flex').addClass('d-none');
    }
}
