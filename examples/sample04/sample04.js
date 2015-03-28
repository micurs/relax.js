var _ = require("lodash");
var relaxjs = require('relaxjs');
var redis = require("redis");
function genGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
var store = redis.createClient();
var mysite = relaxjs.site('Example #4');
var usersResource = {
    name: 'users',
    view: 'users',
    layout: 'layout',
    onGet: function (query, respond) {
        var self = this;
        store.hgetall('user', function (err, items) {
            var userList = _.object(_.keys(items), _.map(_.values(items), function (item) {
                return JSON.parse(item);
            }));
            self.data = {
                users: userList
            };
            respond.ok();
        });
    },
    resources: [
        {
            name: 'user',
            view: 'user',
            layout: 'layout',
            urlParameters: [
                'idx'
            ],
            onPost: function (query, userData, respond) {
                var self = this;
                var newKey = genGuid();
                userData['userId'] = newKey;
                store.hset('user', newKey, JSON.stringify(userData));
                store.save();
                respond.redirect('/users');
            },
            onGet: function (query, respond) {
                var self = this;
                var userid = self._parameters.idx;
                store.hget('user', userid, function (err, data) {
                    if (data) {
                        self.data = JSON.parse(data);
                        respond.ok();
                    }
                    else {
                        var errMsg = 'Could not find User with id: ' + userid;
                        var respError = new relaxjs.RxError(errMsg, 'User not found', 404);
                        respond.fail(respError);
                    }
                });
            },
            onDelete: function (query, respond) {
                var self = this;
                var userid = self._parameters.idx;
                store.hdel('user', userid, function (err, data) {
                    if (!err) {
                        respond.redirect('/users');
                    }
                    else {
                        var errMsg = "Could not find User with id: " + userid;
                        var respError = new relaxjs.RxError(errMsg, 'User not found', 404);
                        respond.fail(respError);
                    }
                });
            },
            resources: [
                {
                    name: 'edit',
                    view: 'edituser',
                    layout: 'layout',
                    urlParameters: [
                        'idx'
                    ],
                    onGet: function (query, respond) {
                        var self = this;
                        var userid = self._parameters.idx;
                        store.hget('user', userid, function (err, data) {
                            if (data) {
                                self.data = JSON.parse(data);
                                respond.ok();
                            }
                            else {
                                var errMsg = 'Could not find User with id: ' + userid;
                                var respError = new relaxjs.RxError(errMsg, 'User not found', 404);
                                respond.fail(respError);
                            }
                        });
                    },
                    onPatch: function (query, userData, respond) {
                        var self = this;
                        var userid = self._parameters.idx;
                        userData['userId'] = userid;
                        console.log(userData);
                        store.hset('user', userid, JSON.stringify(userData), function (err, data) {
                            if (!err) {
                                store.save();
                                respond.redirect('/users');
                            }
                            else {
                                var errMsg = 'Could not Save User with id: ' + userid;
                                var respError = new relaxjs.RxError(errMsg, 'User could not be updated found');
                                respond.fail(respError);
                            }
                        });
                    }
                }
            ]
        }
    ]
};
mysite.add(usersResource);
mysite.setHome('/users');
mysite.serve().listen(3000);
