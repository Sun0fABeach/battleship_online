import * as menu_navigation from './menu_navigation';
import * as communications from './communications';
import * as ship_placement from './ship_placement';
import * as battle from './battle';


$(document).ready(function() {
    menu_navigation.init();
    communications.init();
    ship_placement.init();
    ship_placement.activate();
    battle.init();
});
