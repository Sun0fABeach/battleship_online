/**
 * Manages opening and closing the overlay screen and filling it with the
 * requested content, which includes performing AJAX requests.
 * @module overlay_screen
 */

/**
 * @typedef HTMLCache
 * @type {Object}
 *
 * @property {String} imprint - HTML for imprint category.
 * @property {String} help - HTML for help category.
 */

 /** HTML cache for each overlay content category.
  *  @type {HTMLCache}
  *  @private
  */
const html_cache = {
    imprint: null,
    help: null
};

/**
 * Initialize module.
 */
export function init() {
    $('footer .overlay-link').click(event => {
        event.preventDefault();
        event.stopPropagation();
        const category = $(event.target).attr('href').split('/').pop();
        display_screen(category);
    });
}

/**
 * Open the overlay screen.
 * @private
 *
 * @param {String} category - Overlay content category
 */
function display_screen(category) {
    const $screen = setup_screen();
    open_box($screen);
    show_content($screen, category);
}

/**
 * Acquire the screen object. Create and insert it, if it has not been already.
 * @private
 *
 * @returns {jQuery} [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                   DOM element (overlay screen container).
 */
function setup_screen() {
    const screen_id = 'overlay-screen';
    let $screen = $('#'+screen_id);

    if($screen.length > 0)
        return $screen;

    const $content_container = $('<div>');

    $screen = $('<div>')
        .attr('id', screen_id)
        .append($content_container) // for content fade animation
        .prependTo('body');

    const $close_btn = $('<button>')
        .attr('type', 'button')
        .addClass('btn btn-block btn-dark mt-4')
        .text('Close')
        .click(close_screen.bind(null, $screen));

    const $btn_container = $('<div>')
        .addClass('overlay-close text-center text-md-left')
        .append($close_btn);

    $content_container
        .append('<div>') // for category content
        .append($btn_container);

    return $screen;
}

/**
 * Open the overlay screen container.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (overlay screen container).
 */
function open_box($screen) {
    $screen
    .css({width: 0, height: 0})
    .show()
    .animate({
        width: '100%',
        height: '100%',
    }, {
        duration: 800
    });
}

/**
 * Show contents of the overlay screen container. If done the first time, the
 * content will be loaded via AJAX and cached.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (overlay screen container).
 * @param {String} category - Overlay content category
 */
function show_content($screen, category) {
    const $content_container = $screen.children('div:first-child');
    const $category_content = $content_container.children('div:first-child');

    if($category_content.hasClass(category)) {
        /* correct content is already in DOM */
        animate_show_content();
    } else {
        $category_content
        .removeClass()
        .addClass(category);

        if(html_cache[category]) {
            $category_content.html(html_cache[category]);
            animate_show_content();
        } else {
            $category_content.load('_' + category, html => {
                html_cache[category] = html;
                animate_show_content();
            });
        }
    }

    function animate_show_content() {
        $content_container.hide();
        $screen.queue(next => { // fadeIn after screen open animation finished
            $content_container.fadeIn(300);
            next();
        });
    }
}

/**
 * Close the overlay screen container.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (overlay screen container).
 */
function close_screen($screen) {
    $screen.fadeOut();
}
