/** Module containing the chat bubble class.
    @module classes/chat_bubble */


class ChatBubble {
    constructor($target, css_class) {
        this._$target = $target;
        this._css_class = css_class;
    }

    show(message, click_cb=undefined) {
        this._$target.popover('dispose');
        this._$target.popover({
            template:
            `<div class="popover ${this._css_class}">
                <div class="arrow">
                </div>
                <h3 class="popover-header">
                </h3>
                <div class="popover-body text-center">
                </div>
                <div class="text-center text-muted mx-2 mb-1">
                    (click to hide)
                </div>
            </div>`,
            content: message,
            placement: 'bottom'
        });

        this._$target.on('inserted.bs.popover', () => {
            $('.popover.' + this._css_class).click(() => {
                this.hide();
                if(click_cb)
                    click_cb();
            });
        });

        this._$target.popover('show');
        this._$target.css('cursor', 'pointer');
    }

    hide() {
        this._$target.popover('hide');
    }
}


class PlayerChatBubble extends ChatBubble {
    constructor($target) {
        super($target, 'chat-bubble-player');
        this._hide_delay = 3000;
        this._hide_to = null;
    }

    show(message) {
        this._hide_to = setTimeout(() => {
            this.hide();
            this._hide_to = null;
        }, this._hide_delay);

        super.show(message, () => {
            if(this._hide_to) {
                clearTimeout(this._hide_to);
                this._hide_to = null;
            }
        });
    }
}


class OpponentChatBubble extends ChatBubble {
    constructor($target) {
        super($target, 'chat-bubble-opponent');
    }
}

export { PlayerChatBubble, OpponentChatBubble };
