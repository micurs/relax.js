// Relax.js example #3
///<reference path='typings/redis/redis.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var _ = require("underscore");
var relaxjs = require('relaxjs');
var redis = require("redis");
// Create the data store (with redis)
var store = redis.createClient();
store.hset('user', 'f40705f1-58b3-47e6-98da-5955c6bd1e30', '{ "firstName": "Mary", "lastName": "Stewart", "userId": "f40705f1-58b3-47e6-98da-5955c6bd1e30" }');
store.hset('user', 'f40705f1-58b3-47e6-98da-3956c6fd1e31', '{ "firstName": "John", "lastName": "Smith", "userId": "f40705f1-58b3-47e6-98da-3956c6fd1e31" }');
store.save();
// Create the application by assembling the resources
var mysite = relaxjs.site('Example #3');
// Create a resource that can retrieve and store users info into redis
var usersResource = {
    name: 'users',
    view: 'users',
    onGet: function (query, respond) {
        var _this = this;
        store.hgetall('user', function (err, items) {
            var userList = _.object(_.keys(items), _.map(_.values(items), function (item) { return JSON.parse(item); }));
            _this.ok(respond, { users: userList });
        });
    },
    resources: [{
        name: 'user',
        view: 'user',
        onGet: function (query, respond) {
            var _this = this;
            var userid = query['id'];
            store.hget('user', userid, function (err, userdata) {
                if (userdata) {
                    _this.ok(respond, JSON.parse(userdata));
                }
                else {
                    var errMsg = 'Could not find User with id: ' + userid;
                    var respError = new relaxjs.RxError(errMsg, 'User not found', 404);
                    respond(respError);
                }
            });
        }
    }]
};
mysite.add(usersResource);
mysite.serve().listen(3000);
