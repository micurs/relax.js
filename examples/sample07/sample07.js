var relaxjs = require('relaxjs');
var ck = require('cookie');
var _ = require('lodash');
var site = relaxjs.site('sample7.com');
site.add({
    name: 'set',
    view: 'set',
    onGet: function (query, respond) {
        respond.ok();
    },
    onPost: function (query, postData, respond) {
        if (postData.value) {
            this.data = postData;
            var cookieStr = ck.serialize('name', postData.value);
            this.setCookie(cookieStr);
        }
        respond.redirect('/check');
    }
});
site.add({
    name: 'check',
    view: 'check',
    onGet: function (query, respond) {
        this.data = {
            cookies: this.getCookies()
        };
        respond.ok();
    }
});
site.addRequestFilter(function (route, body, complete) {
    if (route.pathname === '/set') {
        complete();
        return;
    }
    if (!route.cookies)
        complete(new relaxjs.RxError('Need to set a cookie', 'cookie required', 302, '/set'));
    var cookies = _.map(route.cookies, function (c) {
        return ck.parse(c);
    });
    var nameCookie = _.find(cookies, function (c) {
        return c['name'] !== undefined;
    });
    if (!nameCookie)
        complete(new relaxjs.RxError('Need to set a cookie "name" ', 'cookie required', 302, '/set'));
    complete();
});
site.enableFilters = true;
site.setHome('/set');
site.serve().listen(3000);
