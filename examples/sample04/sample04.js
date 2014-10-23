// Relax.js example #4
///<reference path='typings/redis/redis.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var _ = require("underscore");
var relaxjs = require('relaxjs');
var redis = require("redis");
// Create the data store (with redis)
var store = redis.createClient();
store.hset('user', '100', '{ "firstName": "Mary", "lastName": "Stewart", "userId": "100" }');
store.hset('user', '101', '{ "firstName": "John", "lastName": "Smith", "userId": "101" }');
store.save();
var newKey = 102;
// Create the application by assembling the resources
var mysite = relaxjs.site('Example #3');
// Create a resource that can retrieve and store users info into redis
var usersResource = {
    name: 'users',
    view: 'users',
    layout: 'layout',
    onGet: function (query, respond) {
        //var ucount = this.childTypeCount('user');
        //console.log('Get users list: '+ucount+' items.');
        store.hgetall('user', function (err, items) {
            var userList = _.object(_.keys(items), _.map(_.values(items), function (item) { return JSON.parse(item); }));
            console.log(JSON.stringify(userList, null, ' '));
            respond(null, { users: userList });
        });
    },
    resources: [{
        name: 'user',
        view: 'user',
        layout: 'layout',
        onPost: function (query, userData, respond) {
            console.log('Create New User Request: ' + JSON.stringify(userData));
            userData['userId'] = newKey;
            store.hset('user', newKey, JSON.stringify(userData));
            store.save();
            newKey++;
            respond(null, { result: 'ok', user: userData });
        },
        onGet: function (query, respond) {
            var userid = parseInt(query['id']);
            store.hget('user', userid, function (err, data) {
                if (data) {
                    respond(null, JSON.parse(data));
                }
                else {
                    respond(null, {});
                }
            });
        }
    }]
};
mysite.add(usersResource);
mysite.serve().listen(3000);
