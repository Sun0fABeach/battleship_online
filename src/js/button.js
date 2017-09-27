let $game_msg;

export default class Button {
    constructor($button, valid_test, action, valid_msg, invalid_msg) {
        this.$btn = $button;

        if(!$game_msg)
            $game_msg = $('#game-message > span');

        $button
        .focusout(() => {  // using lambda so 'this' is not bound by jQuery
            this._button_normal();
        })
        .click(() => {
            if(valid_test()) {
                this._button_valid();
                action();
                if(valid_msg) {
                    $game_msg.fadeOut(() => $game_msg.html(valid_msg));
                    $game_msg.fadeIn();
                }
            } else {
                this._button_invalid();
                if(invalid_msg) {
                    $game_msg.fadeOut(() => $game_msg.html(invalid_msg));
                    $game_msg.fadeIn();
                }
            }
        });
    }

    show(completion_cb) {
        this.$btn.fadeIn(completion_cb);
    }

    hide(completion_cb) {
        this.$btn.fadeOut(completion_cb);
    }

    _button_valid() {
        this.$btn.addClass('btn-success');
    }

    _button_invalid() {
        this.$btn.effect('shake');
        this.$btn.addClass('btn-danger');
    }

    _button_normal() {
        this.$btn.removeClass('btn-success btn-danger');
    }
}
