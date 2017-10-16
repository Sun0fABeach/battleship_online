export default class MenuButton {
    constructor(btn_name, action) {
        this._$btn = $('#main-menu button[name="'+btn_name+'"]');
        this._register_click_cb(action);
        this._clickable = true;

        this._$btn
        .blur(() => this.normal())
        .click(this._click_cb);
    }

    is_visible() {
        /* first check style attr used by jquery hide/show. this is necessary
           b/c the slide button css stays on display: none on larger screens,
           but we can still determine its state by looking at the style attr. */
        const style_attr = this._$btn.attr('style');
        if(style_attr)
            return !style_attr.match(/display: none/);
        else
            return this._$btn.css('display') !== 'none';
    }

    show(completion_cb) {
        this.clickable(true);
        this._$btn.fadeIn(completion_cb);
    }

    hide(completion_cb) {
        this.clickable(false);  // prohibit clicks on fadeout
        this._$btn.fadeOut(completion_cb);
    }

    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$btn.click();
    }

    clickable(active) {
        this._clickable = active;
    }

    invalid() {
        this._$btn.effect('shake');
        this._$btn.addClass('btn-danger');
    }

    valid() {
        this._$btn.addClass('btn-success');
    }

    normal() {
        this._$btn.removeClass('btn-success btn-danger');
    }

    _register_click_cb(action) {
        this._$btn.click((event) => {
            event.preventDefault();   // even if no action is to be performed
            event.stopPropagation();  // we don't allow bubbling or defaults
            if(this._clickable && action)
                action();
        });
    }
}
