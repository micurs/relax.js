///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/Q.d.ts' />
///<reference path='typings/underscore/underscore.d.ts' />
///<reference path='typings/underscore.string/underscore.string.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import relaxjs = require('relaxjs');


var usersResource : relaxjs.Resource = {
  name : 'users',
  view : 'users_list',
  childs : [
    { name: 'user', data: { firstName: 'John', lastName: 'Smith' } },
    { name: 'user', data: { firstName: 'Joe', lastName: 'Doe' } },
    { name: 'user', data: { firstName: 'Mary', lastName: 'Linn' } },
    { name: 'user', data: { firstName: 'Tracy', lastName: 'Stewart' } },
  ]
};

// Create the application by assembling the resources
var mysite = relaxjs.site('micurs.com');

// Create the application by assembling the resources
mysite.add( 'users', usersResource );

// Get the application server for the site
var appSrv = mysite.serve();

// And serve it
appSrv.listen(3000);
