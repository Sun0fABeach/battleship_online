/**
 * Manages opening and closing the overlay screen and filling it with the
 * requested content, which includes performing AJAX requests.
 * @module overlay_screen
 */

/**
 * @typedef CategoryData
 * @type {Object}
 *
 * @property {String} url - URL of html partial.
 * @property {String} container_class - Class to apply to category content
 *                                      container.
 * @property {String} html - Cached html content for the category.
 */

/**
 * @typedef CategoryContent
 * @type {Object}
 *
 * @property {CategoryData} imprint - Data for imprint category.
 * @property {CategoryData} help - Data for help category.
 */

 /** Data for each overlay content category.
  *  @type {CategoryContent}
  *  @private
  */
const content_data = {
    imprint: {
        url: 'partials/imprint.html',
        container_class: 'imprint',
        html: null
    },
    help: {
        url: 'partials/help.html',
        container_class: 'help',
        html: null
    }
};

/**
 * Initialize module.
 */
export function init() {
    for(const category in content_data) {
        $('footer #open-' + category).click(event =>
            display_screen(event, content_data[category])
        );
    }
}

/**
 * Open the overlay screen.
 * @private
 *
 * @param {Event} event - DOM
 *  [Event]{@link https://developer.mozilla.org/en-US/docs/Web/API/Event} object
 * @param {CategoryData} category_data - Data for overlay content category
 */
function display_screen(event, category_data) {
    event.preventDefault();
    event.stopPropagation();

    const $screen = setup_screen();
    open_box($screen);
    show_content($screen, category_data);
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
        .addClass('btn btn-dark mt-4')
        .text('Close')
        .click(() => close_screen($screen));

    const $btn_container = $('<div>')
        .addClass('text-center text-md-left')
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
 * @param {CategoryData} category_data - Data for overlay content category
 */
function show_content($screen, category_data) {
    const $content_container = $screen.children('div:first-child');
    const $category_content = $content_container.children('div:first-child');

    if($category_content.hasClass(category_data.container_class)) {
        /* correct content is already in DOM */
        animate_show_content();

    } else {
        $category_content
        .removeClass()
        .addClass(category_data.container_class);

        if(category_data.html) {
            $category_content.html(category_data.html);
            animate_show_content();
        } else {
            $category_content.load(category_data.url, function(html) {
                category_data.html = html;
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
