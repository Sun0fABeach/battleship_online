let to;


let n = 0;
export function join_host(id, player_name, success_cb, failure_cb) {
    if(n++ % 2 === 0) {
        to = setTimeout(() => {
            success_cb();
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
