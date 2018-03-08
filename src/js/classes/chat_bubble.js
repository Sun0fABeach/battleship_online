/** Module containing the chat bubble class.
    @module classes/chat_bubble */

import { text } from '../ui';
import { adjacent_grid_mode } from '../helpers';


class ChatBubble {
    show(message, click_cb=undefined) {
        this._message = message;
        const press_type = adjacent_grid_mode() ? 'click' : 'tap';

        this._$target.popover('dispose');
        this._$target.popover({
            template:
            `<div class="popover ${this._css_class}">
                <div class="arrow">
                </div>
                <h3 class="popover-header text-center mb-2">
                </h3>
                <div class="popover-body text-center">
                </div>
                <div class="text-center text-muted mt-2">
                    (${press_type} to hide)
                </div>
            </div>`,
            title: this._title,
            content: this._message,
            placement: this._placement
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

    get message() {
        return this._message;
    }
}


class ChatBubbleDesktop extends ChatBubble {
    constructor() {
        super();
        this._placement = 'bottom';
    }
}


const autohideMixin = (Base, hide_delay) => class extends Base {
    constructor(...args) {
        super(...args);
        this._hide_delay = hide_delay;
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
};


class PlayerChatBubble extends autohideMixin(ChatBubbleDesktop, 3000) {
    constructor() {
        super();
        this._$target = text.player_name.$element;
        this._css_class = 'chat-bubble-player';
    }
}


class OpponentChatBubble extends ChatBubbleDesktop {
    constructor() {
        super();
        this._$target = text.opponent_name.$element;
        this._css_class = 'chat-bubble-opponent';
    }
}


class ChatBubbleMobile extends ChatBubble {
    constructor(target_position) {
        super();
        this._$target = $('<div>')
            .attr('id', 'edge-' + target_position)
            .appendTo('body')
            .css({
                position: 'fixed',
                [target_position]: 0,
                width: '100%'
            });
    }

    show(message) {
        this._title += ':';
        super.show(message);
    }
}


class PlayerChatBubbleMobile extends autohideMixin(ChatBubbleMobile, 1000) {
    constructor() {
        super('bottom');
        this._placement = 'top';
        this._css_class = 'chat-bubble-player-mobile';
    }

    show(message) {
        this._title = text.player_name.text;
        /* comment in to activate this bubble */
        // super.show(message);
    }
}


class OpponentChatBubbleMobile extends ChatBubbleMobile {
    constructor() {
        super('top');
        this._placement = 'bottom';
        this._css_class = 'chat-bubble-opponent-mobile';
    }

    show(message) {
        this._title = text.opponent_name.text;
        super.show(message);
    }
}


export {
    PlayerChatBubble,
    OpponentChatBubble,
    PlayerChatBubbleMobile,
    OpponentChatBubbleMobile
};
