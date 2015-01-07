// Relax.js example #6 - adding a filter

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

var counter = 0;

import relaxjs = require('relaxjs');

// Create the application by assembling the resources
var site = relaxjs.site('sample1.com');

site.add(  {
  name: 'test',
  data: { message: "Hello World!" }
});

site.addRequestFilter( (route : relaxjs.routing.Route, body: any, returnCall : relaxjs.FilterResultCB ) => {
  counter++;
  returnCall( null, { count: counter } );
});

site.addRequestFilter( (route : relaxjs.routing.Route, body: any, returnCall : relaxjs.FilterResultCB ) => {
  if ( counter>=6 ) {
    console.log('>>>>> 10 Requests limit reached!  #: ', counter );
    returnCall( new relaxjs.rxError.RxError('Max number of requests reached!'), null );
  }
  else {
    console.log('Max Filter Counting Request #: ', counter );
    returnCall( null, { count: counter } );
  }
});

site.addRequestFilter( (route : relaxjs.routing.Route, body: any, returnCall : relaxjs.FilterResultCB ) => {
  if ( counter<=3 ) {
    console.log('>>>>> Filter Min 3 Request needed before responding  #: ', counter );
    returnCall( new relaxjs.rxError.RxError('Min number of requests not yet reached - please reload!'), null );
  }
  else {
    console.log('Min Filter Counting Request #: ', counter );
    returnCall( null, { count: counter } );
  }
});

site.enableFilters = true;

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
