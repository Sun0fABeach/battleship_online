export default class MenuButton {
    constructor(btn_name, action) {
        this._$btn = $('#main-menu button[name="'+btn_name+'"]');
        this._click_cb = (event) => {
            event.preventDefault();
            event.stopPropagation();
            action();
        };

        this._$btn
        .blur(() => this.normal())
        .click(this._click_cb);
    }

    is_visible() {
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

    click() {
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
}
