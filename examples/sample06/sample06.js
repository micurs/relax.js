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
        this.data = { message: "All good ...", count: counter };
        r.ok();
    }
});
// Filter 1 : count the request. Never fails
site.addRequestFilter(function (route, body, complete) {
    counter++;
    complete(); // Filter pass
});
// Filter 2 : reply with a warning 1 step befaore failinig
site.addRequestFilter(function (route, body, complete) {
    if (counter == 9) {
        // Filter the request sending back a warning message.
        complete(null, { data: { message: "Next call will fail!!", count: counter } });
    }
    else {
        complete(); // Filter pass
    }
});
// Filter 3 : fails if the request counter pass 10
site.addRequestFilter(function (route, body, complete) {
    if (counter >= 10) {
        complete(new relaxjs.RxError('The maximum number of requests was reached!', 'This call cannot go to requested Resource'), null);
    }
    else {
        complete(); // Filter pass
    }
});
site.enableFilters = true;
// Create the application server for the site
var appSrv = site.serve();
// Listen
appSrv.listen(3000);
