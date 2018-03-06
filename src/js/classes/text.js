/** Module containing the Text class.
    @module classes/text */

/** Class representing a modifiable DOM text element. */
class Text {
    /**
     * Create a Text instance.
     * @param {jQuery} $container -
     *  [jQuery]{@link http://api.jquery.com/Types/#jQuery}
     *  DOM text element to be represented.
     */
    constructor($container) {
        this._$container = $container;
    }

    get $element() {
        return this._$container;
    }

    get text() {
        return this._$container.text();
    }

    set_text(new_text, make_bold=false) {
        this._$container.html(new_text);
        this.bold(make_bold);
    }

    fade_swap(new_text, make_bold=false) {
        this._$container
        .fadeOut(() => {
            this.set_text(new_text, make_bold);
        })
        .fadeIn();

        return this;
    }

    bold(active=true) {
        if(active) {
            if(this._$container.parent('strong').length === 0)
                this._$container.wrap('<strong>');
        } else {
            while(this._$container.parent('strong').length > 0)
                this._$container.unwrap('strong');
        }
        return this;
    }
}


export { Text };
export default Text;
