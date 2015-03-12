// Relax.js example #7 - Set and check cookies
///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/cookie/cookie.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var relaxjs = require('relaxjs');
var ck = require('cookie');
var _ = require('lodash');
// Create the application by assembling the resources
var site = relaxjs.site('sample7.com');
/*
 * Allow to set a cookie named 'name' required for accessing the /check page.
*/
site.add({
    name: 'set',
    view: 'set',
    onGet: function (query, respond) {
        this.ok(respond);
    },
    onPost: function (query, postData, respond) {
        if (postData.value) {
            var cookieStr = ck.serialize('name', postData.value);
            this.setCookie(cookieStr);
        }
        this.redirect(respond, '/check');
    }
});
/*
 * Shows all the cookies received
*/
site.add({
    name: 'check',
    view: 'check',
    onGet: function (query, respond) {
        this.ok(respond, { cookies: this.getCookies() });
    }
});
/*
 * Redirect to /set all the request that do not have a cookie
*/
site.addRequestFilter(function (route, body, returnCall) {
    if (!route.cookies)
        returnCall(new relaxjs.rxError.RxError('Need to set a cookie', 'cookie required', 302, '/set'), null);
    var cookies = _.map(route.cookies, function (c) { return ck.parse(c); });
    var nameCookie = _.find(cookies, function (c) { return c['name'] !== undefined; });
    if (!nameCookie)
        returnCall(new relaxjs.rxError.RxError('Need to set a cookie "name" ', 'cookie required', 302, '/set'), null);
    returnCall(null, null);
});
/*
 * Set basic defaults and run the site
*/
site.enableFilters = true;
site.setHome('/check');
site.serve().listen(3000);
