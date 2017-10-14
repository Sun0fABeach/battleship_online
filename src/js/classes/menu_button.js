export default class MenuButton {
    constructor(btn_name, action) {
        this._$btn = $('#main-menu button[name="'+btn_name+'"]');
        if(action)
            this._register_click_cb(action);

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
        this._$btn
        .off('click') // avoid difficult duplicate event handler situations
        .click(this._click_cb)
        .fadeIn(completion_cb);
    }

    hide(completion_cb) {
        this._$btn
        .off('click') // prohibit clicks on fadeout
        .fadeOut(completion_cb);
    }

    click(action) {
        if(action)
            this._register_click_cb(action);
        else
            this._$btn.click();
    }

    clickable(active) {
        if(active)
            this._$btn.click(this._click_cb);
        else
            this._$btn.off('click');
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
        this._click_cb = (event) => {
            event.preventDefault();
            event.stopPropagation();
            action();
        };
        this._$btn.click(this._click_cb);
    }
}
