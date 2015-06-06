// Relax.js example #6 - adding a filter
///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var counter = 0;
var relaxjs = require('relaxjs');
var site = relaxjs.site('sample1.com');
site.add({
    name: 'first',
    outFormat: 'application/json',
    onGet: function (q, r) {
        var rq = this.filtersData['reqCounter'].count;
        if (rq > 10) {
            r.redirect('second');
            return;
        }
        this.data = { message: "First 10 requests ...", count: this.filtersData['reqCounter'].count, filters: this.filtersData };
        r.ok();
    }
});
site.add({
    name: 'second',
    outFormat: 'application/json',
    onGet: function (q, r) {
        this.data = { message: "After 10 requests", count: this.filtersData['reqCounter'].count, filters: this.filtersData };
        r.ok();
    }
});
site.addRequestFilter('pathLength', function (route, body, complete) {
    console.log('Route len:', route.path.length);
    complete(null, { route: route.path });
});
site.addRequestFilter('addHeaders', function (route, body, complete) {
    console.log('Filter passing no data');
    complete();
});
site.addRequestFilter('reqCounter', function (route, body, complete) {
    counter++;
    complete(null, { count: counter });
});
site.enableFilters = true;
site.setHome('/first');
var appSrv = site.serve();
appSrv.listen(3000);
