// Relax.js example #2

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import relaxjs = require('relaxjs');


var usersResource : relaxjs.Resource = {
  name : 'users',
  onGet : function( query: any, respond: relaxjs.DataCallback ) {
    this.ok(respond, { data: { title: 'Users Collection Example', count: this.childrenCount() } } );
  },
  resources : [
    { name: 'tracy-stewart',
      onGet: function( query: any, respond: relaxjs.DataCallback ) {
        var now = new Date();
        this.ok(respond, { firstName: 'Mary', lastName: 'Stewart', date: now } );
      },
      resources: [
        { name: 'address', data: { address: '101 John St. San Francisco CA. ' } }
      ]
    },
    {
      name: 'joe-doe',
      data: { firstName: 'Joe', lastName: 'Doe' },
      resources: [
        { name: 'address', data: { address: '458 5th Aver New York NY. ' } }
      ]
    },
    {
      name: 'john-smith', data: { firstName: 'John', lastName: 'Smith' },
      resources: [
        { name: 'address', data: { address: '33 Pearl St. Los Angeles CA.' } }
      ]
    },
    { name: 'user', data: { firstName: 'Joe', lastName: 'Doe' } },
    { name: 'user', data: { firstName: 'Jane', lastName: 'Linn' } }
    ]
};

// Create the application by assembling the resources
var mysite = relaxjs.site('Example #2');

// Create the application by assembling the resources
mysite.add( usersResource );

// Get the application server for the site
var appSrv = mysite.serve();

// And serve it
appSrv.listen(3000);
