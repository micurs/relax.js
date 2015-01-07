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
  if ( counter>=6 ) {
    console.log('>>>>> FILTER MAX 10 Request Reached!  #: ', counter );
    returnCall( new relaxjs.rxError.RxError('Max number of requests reached!'), null );
  }
  else {
    console.log('Max Filter >>>>> Request #: ', counter );
    returnCall( null, { count: counter } );
  }
});

site.addRequestFilter( (route : relaxjs.routing.Route, body: any, returnCall : relaxjs.FilterResultCB ) => {
  if ( counter<=3 ) {
    console.log('>>>>> FILTER MIN 3 Request needed!  #: ', counter );
    returnCall( new relaxjs.rxError.RxError('Min number of requests not yet reached - please reload!'), null );
  }
  else {
    console.log('Min Filter >>>>> Request #: ', counter );
    returnCall( null, { count: counter } );
  }
});

site.enableFilters = true;

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
