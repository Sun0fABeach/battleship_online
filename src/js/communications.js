export function init() {

}

let i = 0;
export function host(success_cb, failure_cb) {
    if(i++ % 2 == 0)
        setTimeout(() => success_cb('Dummy'), 1200);
    else
        setTimeout(() => failure_cb(), 1200);
}
