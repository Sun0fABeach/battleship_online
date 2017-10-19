export default class Text {
    constructor($container) {
        this._$container = $container;
    }

    change(new_text, fade=true) {
        if(!fade) {
            this._$container.html(new_text);
            return;
        }

        this._$container
        .fadeOut(
            () => this._$container.html(new_text)
        )
        .fadeIn();
    }

    get text() {
        return this._$container.text();
    }
}
