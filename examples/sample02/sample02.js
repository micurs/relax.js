// relaxjs example #2 - part of relaxjs v 0.1.4
// by Michele Ursino
///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var relaxjs = require('relaxjs');
var marystewart = {
    name: 'mary-stewart',
    outFormat: 'application/json',
    onGet: function (query, respond) {
        this.data = { firstName: 'Mary', lastName: 'Stewart' };
        respond.ok();
    },
    resources: [
        { name: 'address', outFormat: 'application/json', data: { address: '101 John St. San Francisco CA. ' } }
    ]
};
var joedoe = {
    name: 'joe-doe',
    outFormat: 'application/json',
    data: { firstName: 'Joe', lastName: 'Doe' },
    resources: [
        { name: 'address', outFormat: 'application/json', data: { address: '458 5th Avenue New York NY. ' } }
    ]
};
var johnsmith = {
    name: 'john-smith',
    outFormat: 'application/json',
    onGet: function (q, respond) {
        this.data = { firstName: 'John', lastName: 'Smith', address: this.resources.address[0].data, phone: this.resources.phone[0].data };
        respond.ok();
    },
    resources: [
        { name: 'address', outFormat: 'application/json', data: { value: '33 Pearl St. Los Angeles CA.' } },
        { name: 'phone', outFormat: 'application/json', data: { value: '123.456.7890' } },
        { name: 'phone', outFormat: 'application/json', data: { value: '456.456.7890' } }
    ]
};
var usersResource = {
    name: 'users',
    outFormat: 'application/json',
    onGet: function (query, respond) {
        this.data = { title: 'Users Collection Example', count: this.childrenCount() };
        respond.ok();
    },
    resources: [
        marystewart,
        joedoe,
        johnsmith
    ]
};
// Create the application by assembling the resources
var mysite = relaxjs.site('Example #2');
// Create the application by assembling the resources
mysite.add(usersResource);
// Get the application server for the site
var appSrv = mysite.serve();
// And serve it
appSrv.listen(3000);
