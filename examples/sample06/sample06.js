// Relax.js example #6 - adding a filter
///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var counter = 0;
var relaxjs = require('relaxjs');
// Create the application by assembling the resources
var site = relaxjs.site('sample1.com');
site.add({
    name: 'test',
    onGet: function (q, r) {
        this.ok(r, { data: { message: "All good ...", count: counter } });
    }
});
// Filter 1 : count the request. Never fails
site.addRequestFilter(function (route, body, resp) {
    counter++;
    this.ok(resp, null); // Filter pass
});
// Filter 2 : reply with a warning 1 step befaore failinig
site.addRequestFilter(function (route, body, resp) {
    if (counter == 9) {
        this.ok(resp, { data: { message: "Next call it will fail!!", count: counter } });
    }
    else {
        this.ok(resp, null);
    }
});
// Filter 3 : fails if the request counter pass 10
site.addRequestFilter(function (route, body, resp) {
    if (counter >= 10) {
        this.fail(resp, new relaxjs.rxError.RxError('Max number of requests reached!'));
    }
    else {
        this.ok(resp, null);
    }
});
site.enableFilters = true;
// Create the application server for the site
var appSrv = site.serve();
// Listen
appSrv.listen(3000);
