let to;
let k = 0;


let request_count = 0;
export function request_hosts(success_cb, failure_cb) {
    if(k !== 1) {
        to = setTimeout(() => {
            if(request_count === 0) {
                success_cb([
                    {
                        name: 'Bitchfresse',
                        id: 0,
                    },
                    {
                        name: 'Masafaka',
                        id: 1,
                    }
                ]);
            } else if(request_count === 1) {
                success_cb([
                    {
                        name: 'Nigguh',
                        id: 2,
                    }
                ]);
            } else {
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
            }
            ++request_count;
        }, 1200);
    } else {
        to = setTimeout(() => {
            failure_cb();
        }, 1200);
    }

    ++k;
}

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
