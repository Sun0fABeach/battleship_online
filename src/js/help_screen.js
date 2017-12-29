/**
 * Manages opening and closing the help screen, including the AJAX request.
 * @module help_screen
 */

/** Whether content of the help screen has already been loaded from server */
let content_loaded = false;

/**
 * Initialize module.
 */
export function init() {
    $('footer #open-help').click(open_help);
}

/**
 * Open the help screen.
 * @private
 */
function open_help(event) {
    event.preventDefault();
    event.stopPropagation();

    const $screen = get_screen();
    open_screen($screen);
    show_content($screen);
}

/**
 * Acquire the screen object. Create and insert it, if it has not been already.
 * @private
 *
 * @returns {jQuery} [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                   DOM element (help screen container).
 */
function get_screen() {
    const screen_id = 'help-screen';

    if(content_loaded)
        return $('#'+screen_id);
    else
        return $('<div id="'+screen_id+'">').prependTo('body');
}

/**
 * Open the help screen container.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (help screen container).
 */
function open_screen($screen) {
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
 * Open the help screen container. If done the first time, the content will be
 * loaded via AJAX.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (help screen container).
 */
function show_content($screen) {
    if(content_loaded) {
        animate_show_content();
    } else {
        $screen.load('partials/help.html', () => {
            $screen.find('button').click(() => close_help($screen));
            animate_show_content();
            content_loaded = true;
        });
    }

    function animate_show_content() {
        const $content = $screen.children('div').hide();

        $screen
        .queue(next => {
            $content.fadeIn(300);
            next();
        });
    }
}

/**
 * Close the help screen container.
 * @private
 *
 * @param {jQuery} $screen [jQuery]{@link http://api.jquery.com/Types/#jQuery}
 *                 DOM element (help screen container).
 */
function close_help($screen) {
    $screen.fadeOut();
}
