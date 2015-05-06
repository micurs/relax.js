// Relax.js example #6 - adding a filter

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

var counter = 0;

import relaxjs = require('relaxjs');

// Create the application by assembling the resources
var site = relaxjs.site('sample1.com');


site.add(  {
  name: 'first',
  outFormat: 'application/json',
  onGet: function( q, r ) {
    var rq = this.filtersData['reqCounter'].count;
    if ( rq>10 ) {
      r.redirect('second');
      return;
    }
    this.data = { message: "First 10 requests ...", count: this.filtersData['reqCounter'].count, filters: this.filtersData } ;
    r.ok();
  }
});

site.add(  {
  name: 'second',
  outFormat: 'application/json',
  onGet: function( q, r ) {
    this.data = { message: "After 10 requests", count: this.filtersData['reqCounter'].count, filters: this.filtersData } ;
    r.ok();
  }
});


// Filter 'pathLength' pass the lenght of the path as received to the resource being called. 
site.addRequestFilter( 'pathLength',
                       function( route : relaxjs.routing.Route, 
                                 body: any, 
                                 complete : relaxjs.FilterResultCB )  {
  console.log('Route len:', route.path.length );
  complete(null, { route: route.path } );
});

// Filter 'noData' with no data passed to the resource being called. 
site.addRequestFilter( 'noData',
                       function( route : relaxjs.routing.Route, 
                                 body: any, 
                                 complete : relaxjs.FilterResultCB )  {
  console.log('Filter passing no data' );
  complete();
});


// Filter 'reqCounter' keep count of the number of requests  
site.addRequestFilter( 'reqCounter',
                       function( route : relaxjs.routing.Route, 
                                 body: any, 
                                 complete : relaxjs.FilterResultCB )  {
  counter++;
  complete( null , { count: counter });  // Filter pass
});



site.enableFilters = true;
site.setHome('/first')

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
