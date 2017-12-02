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

    click(action) {}

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

    show(completion_cb) {}

    hide(completion_cb) {
        this.clickable(false);  // prohibit clicks on fadeout
        this._$element.fadeOut(completion_cb);
    }

    text(new_text) {}

    clickable(active) {
        this._clickable = active;
    }
}

/** A single DOM menu button. */
export class MenuButton extends MenuButtonBase {
    /**
     * Create a MenuButton instance.
     * @param {!String} btn_name - Name of the button as defined via HTML name
     *                              attribute
     * @param {Function} [action=undefined] - Callback to trigger on
     *                                        button click
     */
    constructor(btn_name, action) {
        super('#main-menu #button-container > button#' + btn_name, action);
        this._register_click_cb(action);
        this._$element
        .blur(() => this.normal())
        .click(this._click_cb);
    }

    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$element.click();
    }

    show(completion_cb) {
        this.clickable(true);
        this._$element.fadeIn(completion_cb);
    }

    text(new_text) {
        if(new_text)
            this._$element.text(new_text);
        else
            return this._$element.text();
    }

    invalid() {
        this._$element.effect('shake');
        this._$element.addClass('btn-danger');
    }

    valid() {
        this._$element.addClass('btn-success');
    }

    normal() {
        this._$element.removeClass('btn-success btn-danger');
    }

    _register_click_cb(action) {
        this._$element.click((event) => {
            event.preventDefault();   // even if no action is to be performed
            event.stopPropagation();  // we don't allow bubbling or defaults
            if(this._clickable && action)
                action();
        });
    }
}

/** A DOM menu button that has a dropdown connected to it. */
export class MenuDropdownButton extends MenuButtonBase {
    /**
     * Create a MenuButton instance.
     * @param {!String} btn_name - Name of the button as defined via HTML name
     *                              attribute
     * @param {Function} [action=undefined] - Callback to trigger on
     *                                        button click
     */
    constructor(btn_name, action) {
        super('#main-menu #button-container > .btn-group#' + btn_name, action);
        this._$action_btn = this._$element.children('button:first-of-type');
        this._register_click_cb(action);
        this._$action_btn.click(this._click_cb);

        this._$dropdown_options = this._$element.find('.dropdown-item');
        const that = this;
        this._$dropdown_options.click(function() {
            that.set_selection($(this).index());
        });
    }

    set_selection_handler(handler) {
        this._$selection_cb = handler;
    }

    set_selection(idx) {
        this._$selection = this._$dropdown_options.eq(idx);
        if(this._$selection_cb)
            this._$selection_cb(this.selection_text());
    }

    selection_text() {
        return this._$selection ? this._$selection.text() : '';
    }

    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$action_btn.click();
    }

    show(completion_cb) {
        this._$element.fadeIn({
            start: () => {
                this.clickable(true);
                /* jQuery sets display: block when fading, so reset to original
                   bootstrap value to prevent it from breaking the layout */
                this._$element.css('display', 'inline-flex');
            },
            complete: () => {
                if(completion_cb)
                    completion_cb();
            }
        });
    }

    text(new_text) {
        if(new_text)
            this._$action_btn.children('div').text(new_text);
        else
            return this._$action_btn.children('div').text();
    }

    _register_click_cb(action) {
        this._$action_btn.click((event) => {
            event.preventDefault();   // even if no action is to be performed
            event.stopPropagation();  // we don't allow bubbling or defaults
            if(this._clickable && action)
                action(this.selection_text());
        });
    }
}
