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

        socket.on('add host', (host) => {
            this._add_item(host);
        });
        socket.on('remove host', (id) => {
            this._remove_item(id);
        });
    }

    open(player_name) {
        this._player_name = player_name; // needed for networking
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
    }

    _close() {
        this._socket.emit('host unwatch');
        super._close();
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

        this._socket.emit('join', host.id, this._player_name, (success) => {
            this._join_inputs_enable(true);
            this._$close.click(() => this._close());

            if(success) {
                super._close();
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
