export default class Text {
    constructor($container) {
        this._$container = $container;
    }

    get text() {
        return this._$container.text();
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

    bold(active) {
        if(active) {
            if(this._$container.parent('strong').length === 0)
                this._$container.wrap('<strong>');
        } else {
            while(this._$container.parent('strong').length > 0)
                this._$container.unwrap('strong');
        }
    }
}
