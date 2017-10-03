export function init() {

}

let to;
let i = 0, j = 0, k = 0;
export function host(success_cb, failure_cb) {
    if(i++ % 2 == 0) {
        to = setTimeout(() => {
            success_cb();
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
        }, 1200);
    }
}

export function request_opponent(success_cb, failure_cb) {
    if(j++ % 2 == 0) {
        to = setTimeout(() => {
            success_cb('Dummy');
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
        }, 1200);
    }
}

export function request_hosts(success_cb, failure_cb) {
    if(k++ % 2 == 0) {
        to = setTimeout(() => {
            success_cb([
                {
                    name: 'Bitchfresse',
                    id: 0,
                },
                {
                    name: 'Masafaka',
                    id: 1,
                },
                {
                    name: 'Nigguh',
                    id: 2,
                }
            ]);
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
        }, 1200);
    }
}

export function cancel_request() {
    clearTimeout(to);
    to = null;
}
