import * as communications from '../communications';

class Modal {
    constructor($modal, config) {
        this._$modal = $modal;
        this._cfg = config;
        this._$list_container = $modal.find('ul');
        this._$host_search = $modal.find('input[name="host-search"]');
        this._$random_join = $modal.find('button[name="join-random"]');
    }

    _open() {
        this._$modal.modal(this._cfg);
    }

    close() {
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
    constructor($modal, config) {
        super($modal, config);

        this._li_class = 'list-group-item d-flex ' +
                            'justify-content-between align-items-center';
        this._join_btn_class = 'btn btn-sm btn-info float-right';

        this._$list_empty_text = $('<li class="list-group-item text-center">' +
                                'Currently no hosted games.</li>');
        this._$join_btn = $('<button type="button" name="join"' +
                            'class="'+this._join_btn_class+'">Join</button>');
        this._$loading_text = this._$list_container.find('li');

        $modal.on('hidden.bs.modal', () => {
            this._clear_list();
            this._$list_container.append(this._$loading_text);
            this._$host_search.hide();
            this._$random_join.hide();
        });
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

    _clear_list() {
        this._$list_container.empty();
    }
}
