export default class Text {
    constructor($container) {
        this._$container = $container;
    }

    change(new_text) {
        this._$container
        .fadeOut( // these fades are prevented on mobile via css
            () => this._$container.html(new_text)
        )
        .fadeIn();
    }
}
