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
    outFormat: 'application/json',
    onGet: function (q, r) {
        this.data = { message: "All good ...", count: this.filtersData['reqCounter'].count, filters: this.filtersData };
        r.ok();
    }
});
site.addRequestFilter('pathLength', function (route, body, complete) {
    console.log('Route len:', route.path.length);
    complete(null, { route: route.path });
});
site.addRequestFilter('noData', function (route, body, complete) {
    console.log('Filter passing no data');
    complete();
});
// Filter 'reqCounter' keep count of the number of requests and stop everu request after 10 
// --------------------------------------------------------------------------------------------
site.addRequestFilter('reqCounter', function (route, body, complete) {
    counter++;
    if (counter >= 10) {
        complete(new relaxjs.RxError('The maximum number of requests was reached!', 'This call cannot go to requested Resource'), null);
    }
    else {
        complete(null, { count: counter }); // Filter pass
    }
});
site.enableFilters = true;
// Create the application server for the site
var appSrv = site.serve();
// Listen
appSrv.listen(3000);
