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
        this._$loading_text = this._$list_container.find('li');
        this._$host_search = $modal.find('input[name="host-search"]');
        this._$random_join = $modal.find('button[name="join-random"]');
        this._$close = $modal.find('button[name="close-hosts"]');

        this._li_class = 'list-group-item d-flex ' +
                            'justify-content-between align-items-center';
        this._join_btn_class = 'btn btn-sm btn-info float-right';

        this._$list_empty_text = $('<li class="list-group-item text-center">' +
                                'Currently no hosted games.</li>');
        this._$join_btn = $('<button type="button" name="join"' +
                            'class="'+this._join_btn_class+'">Join</button>');

        this._$host_search.on('input',
            () => this._handle_search(this._$host_search.val())
        );

        this._$close.click(() => {
            communications.cancel_request();
            this._close();
            this._close_cb();
        });

        $modal.on('hidden.bs.modal', () => this._set_default_state());
    }

    open() {
        super._open();

        communications.request_hosts(
            (hosts) => {
                this._$loading_text.remove();
                this._$host_search.show();
                this._$random_join.show();

                for(const host of hosts) {
                    $('<li class="'+this._li_class+'">' + host.name + '</li>')
                    .append(
                        this._$join_btn.clone().data('host', host)
                    )
                    .appendTo(this._$list_container);
                }
            },
            () => {
                this._$loading_text.remove();
                this._$list_container.append(this._$list_empty_text);
            }
        );
    }

    _set_default_state() {
        this._clear_list();
        this._$list_container.append(this._$loading_text);
        this._$host_search.hide().val('');
        this._$random_join.hide();
    }

    _clear_list() {
        this._$list_container.empty();
    }

    _handle_search(query) {
        const $entries = this._$list_container.find('li');
        query = query.trim().toUpperCase();

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
