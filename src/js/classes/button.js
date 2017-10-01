export default class Button {
    // must be called before using a button object!
    static init(msg_box) {
        this.msg_handler = msg_box;
    }

    constructor($button, valid_test, action, valid_msg, invalid_msg) {
        this._$btn = $button;

        $button
        .focusout(() => {  // using lambda so 'this' is not bound by jQuery
            this._button_normal();
        })
        .click(() => {
            if(valid_test()) {
                // this._button_valid();
                action();
                if(valid_msg)
                    Button.msg_handler.change(valid_msg);
            } else {
                this._button_invalid();
                if(invalid_msg)
                    Button.msg_handler.change(invalid_msg);
            }
        });
    }

    show(completion_cb) {
        this._$btn.fadeIn(completion_cb);
    }

    hide(completion_cb) {
        this._$btn.fadeOut(completion_cb);
    }

    click() {
        this._$btn.click();
    }

    _button_valid() {
        this._$btn.addClass('btn-success');
    }

    _button_invalid() {
        this._$btn.effect('shake');
        this._$btn.addClass('btn-danger');
    }

    _button_normal() {
        this._$btn.removeClass('btn-success btn-danger');
    }
}
