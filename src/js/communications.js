export function init() {

}

let to;
let i = 0, j = 0;
export function host(success_cb, failure_cb) {
    if(i++ % 2 == 0) {
        to = setTimeout(() => {
            success_cb();
            to = null;
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
            to = null;
        }, 1200);
    }
}

export function request_opponent(success_cb, failure_cb) {
    if(j++ % 2 == 0) {
        to = setTimeout(() => {
            success_cb('Dummy');
            to = null;
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
            to = null;
        }, 1200);
    }
}

export function cancel_request() {
    clearTimeout(to);
    to = null;
}
