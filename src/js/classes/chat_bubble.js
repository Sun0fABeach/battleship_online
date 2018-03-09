/** Module containing the chat bubble class.
    @module classes/chat_bubble */

import { text } from '../ui';
import { adjacent_grid_mode } from '../helpers';


/** Abstract base class representing a chat bubble.
 *  @abstract */
class ChatBubble {
    /**
     * Create a ChatBubble instance.
     */
    constructor() {
        this._is_open = false;
    }

    /**
     *  Open this chat bubble and display the given message.
     *
     *  @param {!String} message - Text to display inside the bubble
     *  @param {Function} [click_cb] - Callback to execute on bubble click
     */
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

        this._register_event_handlers(click_cb);

        this._$target.popover('show');
        this._$target.css('cursor', 'pointer');
    }

    /**
     *  Hide this chat bubble.
     */
    hide() {
        this._$target.popover('hide');
    }

    /**
     * The text content of this bubble.
     * @readonly
     *
     * @type {String}
     */
    get message() {
        return this._message;
    }

    /**
     * Whether this chat bubble is visible.
     * @readonly
     *
     * @type {Boolean}
     */
    get is_open() {
        return this._is_open;
    }

    /**
     *  Register bootstrap popover event handlers for this bubble.
     *  @private
     *
     *  @param {Function} [click_cb] - Callback to execute on bubble click
     */
    _register_event_handlers(click_cb) {
        this._$target.on('inserted.bs.popover', () => {
            $('.popover.' + this._css_class).click(() => {
                this.hide();
                if(click_cb)
                    click_cb();
            });
        });

        this._$target.on('shown.bs.popover', () => {
            this._is_open = true;
        });

        this._$target.on('hidden.bs.popover', () => {
            this._is_open = false;
        });
    }
}

/** Abstract base class representing a chat bubble on desktop screens.
 *  @abstract */
class ChatBubbleDesktop extends ChatBubble {
    /**
     * Create a ChatBubbleDesktop instance.
     */
    constructor() {
        super();
        this._placement = 'bottom';
    }
}

/**
 * Use to make a chat bubble hide itself after showing it, after a set amount of
 * time.
 *
 * @mixin
 */
const autohideMixin = (Base, hide_delay) => class extends Base {
    /**
     * Initialize ChatBubble instance with mixin data.
     */
    constructor(...args) {
        super(...args);
        this._hide_delay = hide_delay;
        this._hide_to = null;
    }

    /**
     *  Open chat bubble and make sure it closes itself after some time.
     *
     *  @param {!String} message - Text to display inside the bubble
     */
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

/** The player's chat bubble for desktop screens */
class PlayerChatBubble extends autohideMixin(ChatBubbleDesktop, 3000) {
    /**
     * Create a PlayerChatBubble instance.
     */
    constructor() {
        super();
        this._$target = text.player_name.$element;
        this._css_class = 'chat-bubble-player';
    }
}

/** The opponent's chat bubble for desktop screens */
class OpponentChatBubble extends ChatBubbleDesktop {
    /**
     * Create a OpponentChatBubble instance.
     */
    constructor() {
        super();
        this._$target = text.opponent_name.$element;
        this._css_class = 'chat-bubble-opponent';
    }
}

/** Abstract base class representing a chat bubble on mobile screens.
 *  @abstract */
class ChatBubbleMobile extends ChatBubble {
    /**
     * Create a ChatBubbleMobile instance.
     *
     * @param {!String} target_position - Position of the target DOM element the
     *                  chat bubble shall attach itself to. Can be top or bottom
     *                  edge of the screen.
     */
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

    /**
     *  Open this chat bubble and display the given message.
     *
     *  @param {!String} message - Text to display inside the bubble
     */
    show(message) {
        this._title += ':';
        super.show(message);
    }
}

/** The player's chat bubble for mobile screens */
class PlayerChatBubbleMobile extends autohideMixin(ChatBubbleMobile, 1000) {
    /**
     * Create a PlayerChatBubbleMobile instance.
     */
    constructor() {
        super('bottom');
        this._placement = 'top';
        this._css_class = 'chat-bubble-player-mobile';
    }

    /**
     *  Open this chat bubble and display the given message.
     *  NOTE: this bubble has been deactivated due to usability reasons
     *
     *  @param {!String} message - Text to display inside the bubble
     */
    show(message) {
        this._title = text.player_name.text;
        /* comment in to activate this bubble */
        // super.show(message);
    }
}

/** The opponent's chat bubble for mobile screens */
class OpponentChatBubbleMobile extends ChatBubbleMobile {
    /**
     * Create a OpponentChatBubbleMobile instance.
     */
    constructor() {
        super('top');
        this._placement = 'bottom';
        this._css_class = 'chat-bubble-opponent-mobile';
    }

    /**
     *  Open this chat bubble and display the given message.
     *
     *  @param {!String} message - Text to display inside the bubble
     */
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
