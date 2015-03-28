// relaxjs example #2 - part of relaxjs v 0.1.4
// by Michele Ursino
///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/redis/redis.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var _ = require('lodash');
var relaxjs = require('relaxjs');
var redis = require("redis");
// Create the data store (with redis)
var store = redis.createClient();
// Storing some test data in Redis
store.hset('user', 'f40705f1-58b3-47e6-98da-5955c6bd1e30', '{ "firstName": "Mary", "lastName": "Stewart", "userId": "f40705f1-58b3-47e6-98da-5955c6bd1e30" }');
store.hset('user', 'f40705f1-58b3-47e6-98da-3956c6fd1e31', '{ "firstName": "John", "lastName": "Smith", "userId": "f40705f1-58b3-47e6-98da-3956c6fd1e31" }');
store.save();
function findAllUsers(cb) {
    store.hgetall('user', function (err, items) {
        if (err)
            cb(err, null);
        else {
            var res = _.zipObject(_.keys(items), _.map(_.values(items), function (item) { return JSON.parse(item); }));
            console.log(items);
            cb(null, res);
        }
    });
}
function findUser(id, cb) {
    store.hget('user', id, function (err, userdata) {
        if (err || !userdata) {
            var message = err ? err.message : "Could not find a user with the given ID " + id;
            console.log('>> ' + message);
            var respError = new relaxjs.RxError(message, 'User not found', 404);
            cb(respError, null);
        }
        else {
            cb(null, JSON.parse(userdata));
        }
    });
}
// Create a resource that can retrieve and store users info into redis
var usersResource = {
    name: 'users',
    view: 'users',
    onGet: function (query, respond) {
        var _this = this;
        findAllUsers(function (err, users) {
            if (err) {
                respond.fail(new relaxjs.RxError(err.message, 'Error trying to find users', 404));
            }
            else {
                _this.data = { 'users': users };
                respond.ok();
            }
        });
    },
    resources: [{
        name: 'user',
        view: 'user',
        onGet: function (query, respond) {
            var _this = this;
            var self = this;
            var userid = query['id'];
            if (!userid) {
                respond.fail(new relaxjs.RxError('Need the id paramter to find a user', 'User not found', 404));
            }
            else {
                findUser(userid, function (err, userdata) {
                    if (err) {
                        respond.fail(err);
                    }
                    else {
                        _this.data = userdata;
                        respond.ok();
                    }
                });
            }
        }
    }]
};
// Create the site, add the resources and listen
var mysite = relaxjs.site('Example #3');
mysite.add(usersResource);
mysite.serve().listen(3000);
