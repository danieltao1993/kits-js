/**
 * @file http
 */

/* globals XMLHttpRequest window location document*/
/* eslint-disable */

/**
 * get the data from url
 * auto use jsonp or ajax
 * @params 传入的参数
 * @params.method
 * @params.data
 * @params.url
 * @params.fail
 * @params.success
 */
function fetch(params) {
    let fetchObj = null;
    if (/^http(s{0,1}):\/\//.test(params.url)) {
        const pageLoc = location.href.match(/^https{0,1}:\/\/(.+?)(?=\/|$)/);
        const ajaxLoc = params.url.match(/^https{0,1}:\/\/(.+?)(?=\/|$)/);
        if (pageLoc.length === 2 && ajaxLoc.length === 2 && ajaxLoc[1] === pageLoc[1]) {
            fetchObj = this.ajax(params);
        } else {
            fetchObj = this.jsonp(params);
        }
    } else {
        fetchObj = this.ajax(params);
    }
    return fetchObj;
}

/**
 * @params.method
 * @params.data
 * @params.url
 * @params.fail
 * @params.success
 */
function ajax(params) {
    const client = new XMLHttpRequest();
    const method = params.method || 'GET';
    let isAbort = false;
    client.open(method, params.url);
    // client.setRequestHeader('Content-Type', 'application/json');
    client.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    client.withCredentials = true;
    if (method === 'GET') {
        client.send();
    } else {
        client.withCredentials = true;
        client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        const dataStr = Object.keys(params.data).map(key => (
            `${key}=${params.data[key]}`
        ));
        client.send(dataStr.join('&'));
    }
    // timeout
    let waitTime = params.timeout || 10000;
    const timeout = setTimeout(() => {
        client.abort();
        params.fail && params.fail('timeout');
    }, waitTime);
    //
    client.onload = function onload() {
        if (this.status >= 200 && this.status < 300) {
            params.success && params.success(JSON.parse(this.response));
        } else {
            params.fail && params.fail(this.statusText);
        }
        params.complete && params.complete(JSON.parse(this.response));
        clearTimeout(timeout);
    };
    client.onerror = () => {
        params.fail && params.fail(this.statusText);
        clearTimeout(timeout);
    };

    return {
        abort: () => {
            if (!isAbort) {
                isAbort = true;
                client.abort();
            }
        },
        params
    };
}

/**
 * @params 参数
 * @params.url
 * @params.fail
 * @params.success
 */
function jsonp(params) {
    const callbackID = `jsonp_${(+new Date())}_${parseInt(Math.random() * 10e6, 10)}`;
    const script = document.createElement('script');
    let isAbort = false;

    params.url += (params.url.indexOf('?') === '-1' ? '?' : '&');
    params.url += `callback=${callbackID}`;
    script.src = params.url;
    document.head.appendChild(script);
    let waitTime = params.timeout || 10000;
    const timeout = setTimeout(() => {
        if (window[callbackID] !== null) {
            window[callbackID] = null;
            script.parentElement.removeChild(script);
            // console.log('abortStatus:' + isAbort + params.requestId);
            params.fail && params.fail({
                error: null,
                msg: 'timeout'
            });
            params.complete && params.complete(JSON.parse());
        }
    }, waitTime);

    script.addEventListener('error', (e) => {
        window[callbackID] = null;
        script.parentElement.removeChild(script);
        clearTimeout(timeout);
        // console.log('abortStatus:' + isAbort + params.requestId);
        if (!isAbort) {
            params.fail && params.fail({
                error: e,
                msg: 'loaderror'
            });
            params.complete && params.complete();
        }
    });

    window[callbackID] = (data) => {
        // console.log('abortStatus:' + isAbort + params.requestId);
        clearTimeout(timeout);
        if (!isAbort) {
            params.success(data);
            params.complete && params.complete();
        }
        window[callbackID] = null;
        script.parentElement.removeChild(script);
    };

    return {
        abort: () => {
            // console.log('abort' + params.requestId);
            clearTimeout(timeout);
            isAbort = true;
        },
        params
    };
}

const http = {
    fetch,
    ajax,
    jsonp
};

export default http;