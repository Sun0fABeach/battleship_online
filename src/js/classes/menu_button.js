/** Module containing the menu button class.
    @module classes/menu_button */


/** Abstract base class representing a DOM menu button (bottom of main view).
 *  @abstract */
class MenuButtonBase {
    /**
     * Create a MenuButton instance.
     * @param {!String} css_selector - CSS selector required to find the button
     */
    constructor(css_selector) {
        this._$element = $(css_selector);
        this._clickable = true;
    }

    /**
     *  Trigger a click on the button or register an event handler for a future
     *  click. To be implemented by subclasses.
     *  @abstract
     *
     *  @param {Function} [action] - callback to register for button clicks
     */
    click(action) {}

    /**
     *  Return whether this button is visible.
     *
     *  @returns {Boolean} Whether the button is visible
     */
    is_visible() {
        /* first check style attr used by jquery hide/show. this is necessary
           b/c the slide button css stays on display: none on larger screens,
           but we can still determine its state by looking at the style attr. */
        const style_attr = this._$element.attr('style');
        if(style_attr)
            return !style_attr.match(/display: none/);
        else
            return this._$element.css('display') !== 'none';
    }

    /**
     *  Show the button and trigger callback, if one is given.
     *
     *  @param {Function} [completion_cb] - callback to trigger once
     *                                      show is complete
     *  @param {String} [display_type] - css display type of button
     */
    show(completion_cb, display_type='block') {
        this._$element.fadeIn({
            start: () => {
                this.clickable(true);
                /* jQuery sets display: block when fading, so reset to original
                   bootstrap value to prevent it from breaking the layout */
                this._$element.css('display', display_type);
            },
            complete: () => {
                if(completion_cb)
                    completion_cb();
            }
        });
    }

    /**
     *  Hide the button and trigger callback, if one is given.
     *  To be implemented by subclasses.
     *
     *  @param {Function} [completion_cb] - callback to trigger once
     *                                      hide is complete
     */
    hide(completion_cb) {
        this.clickable(false);  // prohibit clicks on fadeout
        this._$element.fadeOut(completion_cb);
    }

    /**
     *  Query or set the text of the button. To be implemented by subclasses.
     *  @abstract
     *
     *  @param {String} [new_text] - Text to set for the button
     *  @returns {(String|undefined)} the current button text, if *new_text*
     *                                was left empty
     */
    text(new_text) {}

    /**
     * Set whether the button should perform an action on click, or not.
     *
     * @param {!Boolean} active - Whether button should be clickable
     */
    clickable(active) {
        this._clickable = active;
    }

    /**
     * Register a callback to be triggered on button click.
     * @private
     *
     * @param {!jQuery} $btn -
     *          [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *          DOM button to register callback for.
     * @param {Function} action - Callback to trigger on button click
     */
    _register_click_cb($btn, action) {
        $btn.click(event => {
            event.preventDefault();   // even if no action is to be performed
            event.stopPropagation();  // we don't allow bubbling or defaults
            if(this._clickable)
                action();
        });
    }
}

/** A single DOM menu button. */
class MenuButton extends MenuButtonBase {
    /**
     * Create a MenuButton instance.
     * @param {!String} btn_name - Name of the button as defined via HTML name
     *                              attribute
     * @param {Function} [action] - Callback to trigger on button click
     */
    constructor(btn_name, action) {
        super('#button-container > button#' + btn_name);
        if(action)
            this._register_click_cb(action);
        this._$element.blur(this.normal.bind(this));
    }

    /**
     *  Trigger a click on the button or register an event handler for a future
     *  click.
     *
     *  @param {Function} [action] - callback to register for button clicks
     */
    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$element.click();
    }

    /**
     *  Query or set the text of the button.
     *
     *  @param {String} [new_text] - Text to set for the button
     *  @returns {(String|undefined)} the current button text, if *new_text*
     *                                was left empty
     */
    text(new_text) {
        if(new_text)
            this._$element.text(new_text);
        else
            return this._$element.text();
    }

    /**
     * Signals that something is invalid, preventing the click action to be
     * performed.
     */
    invalid() {
        this._$element.effect('shake');
        this._$element.addClass('btn-danger');
    }

    /**
     * Signals that some state is valid, allowing the click action to be
     * successfully performed.
     */
    valid() {
        this._$element.addClass('btn-success');
    }

    /**
     * Signals normal button state.
     */
    normal() {
        this._$element.removeClass('btn-success btn-danger');
    }

    /**
     * Register a callback to be triggered on button click.
     * @private
     *
     * @param {Function} [action] - Callback to trigger on button click
     */
    _register_click_cb(action) {
        super._register_click_cb(this._$element, action);
    }
}


/**
 * Callback type for MenuDropdownButton actions.
 * @callback MenuDropdownButtonAction
 * @param {!String} selection_text - Text of the current dropdown selection
 */

/** A DOM menu button that has a dropdown connected to it. */
class MenuDropdownButton extends MenuButtonBase {
    /**
     * Create a MenuButton instance.
     * @param {!String} group_id - Id of the button group
     * @param {MenuDropdownButtonAction} [action] - Callback to trigger on
     *                                              button click
     */
    constructor(group_id, action) {
        super('#button-container > .btn-group#' + group_id, action);
        this._$action_btn = this._$element.children('button:first-of-type');
        if(action)
            this._register_click_cb(action);

        this._$dropdown_options = this._$element.find('.dropdown-item');
        const self = this;
        this._$dropdown_options.click(function() {
            self.set_selection($(this).index());
        });
    }

    /**
     * Register a callback to be triggered on every dropdown selection.
     *
     * @param {Function} handler - callback to trigger on dropdown selection
     */
    set_selection_handler(handler) {
        this._$selection_cb = handler;
    }

    /**
     * Do a dropdown selection.
     *
     * @param {!Number} idx - index of dropdown selection to set
     */
    set_selection(idx) {
        this._$selection = this._$dropdown_options.eq(idx);
        if(this._$selection_cb)
            this._$selection_cb(this.selection_text());
    }

    /**
     * Return the text of the current selection.
     *
     * @returns {String} the text of the current selection, or an empty string
     *                   if no selection has been done
     */
    selection_text() {
        return this._$selection ? this._$selection.text() : '';
    }

    /**
     *  Trigger a click on the button or register an event handler for a future
     *  click.
     *
     *  @param {Function} [action] - callback to register for button clicks
     */
    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$action_btn.click();
    }

    /**
     *  Show the button and trigger callback, if one is given.
     *
     *  @param {Function} [completion_cb] - callback to trigger once
     *                                      show is complete
     */
    show(completion_cb) {
        super.show(completion_cb, 'inline-flex');
    }

    /**
     *  Query or set the text of the button.
     *
     *  @param {String} [new_text] - Text to set for the button
     *  @returns {(String|undefined)} the current button text, if *new_text*
     *                                was left empty
     */
    text(new_text) {
        if(new_text)
            this._$action_btn.children('div').text(new_text);
        else
            return this._$action_btn.children('div').text();
    }

    /**
     * Register a callback to be triggered on button click.
     * @private
     *
     * @param {Function} action - Callback to trigger on button click
     */
    _register_click_cb(action) {
        super._register_click_cb(
            this._$action_btn, () => action(this.selection_text())
        );
    }
}


/**
 * Callback type for MenuChatButtonAction actions.
 * @callback MenuChatButtonAction
 * @param {!String} message - Chat message to send
 */

/** An input group consisting of a text input and a send button. */
class MenuChatButton extends MenuButtonBase {
    /**
     * Create a MenuChatButton instance.
     * @param {!String} group_id - Id of the input group
     * @param {MenuChatButtonAction} [action] - Callback to trigger on
     *                                              message send
     */
    constructor(group_id, action) {
        super('#button-container > .input-group#' + group_id, action);
        this._$send_btn = this._$element.find('button');
        this._$chat_input = this._$element.find('input');
        this._$chat_input.focus(() => this.set_placeholder());
        if(action)
            this._register_click_cb(action);
    }

    /**
     *  Show the button and trigger callback, if one is given.
     *
     *  @param {Function} [completion_cb] - callback to trigger once
     *                                      show is complete
     */
    show(completion_cb) {
        this.set_placeholder();
        super.show(completion_cb, 'flex');
    }

    /**
     *  Trigger a click on the send button or register an event handler for a
     *  future click.
     *
     *  @param {Function} [action] - callback to register for send button clicks
     */
    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$action_btn.click();
    }

    /**
     *  Set the placeholder of the text input field. Will be set to a default
     *  if called with no argument.
     *
     *  @param {String} [text] - Placeholder text to set
     */
    set_placeholder(text=undefined) {
        this._$chat_input.attr('placeholder', text ? text : 'Message');
    }

    /**
     *  Lose focus of the text input field.
     */
    blur() {
        this._$chat_input.blur();
    }

    /**
     * Register a callback to be triggered on message send.
     * @private
     *
     * @param {Function} action - Callback to trigger on message send
     */
    _register_click_cb(action) {
        const handler = () => {
            action(this._$chat_input.val().trim());
            this._$chat_input.val('');
        };
        super._register_click_cb(this._$send_btn, handler);
        this._$chat_input.keyup(e => {
            if(e.keyCode === 13) // enter
                handler();
        });
    }
}

export { MenuButton, MenuDropdownButton, MenuChatButton };
