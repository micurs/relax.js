// Relax.js example #4

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/redis/redis.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import _ = require("lodash");
import relaxjs = require('relaxjs');
import redis = require("redis");

function genGuid() : string {
  // from: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
    });
}

// Create the data store (with redis)
var store = redis.createClient();

// Create the application by assembling the resources
var mysite = relaxjs.site('Example #4');

// Create a resource that can retrieve and store users info into redis
var usersResource : relaxjs.Resource = {
  name: 'users',
  view: 'users',
  layout: 'layout',
  onGet: function( query: any, respond: relaxjs.DataCallback  ) {
    var self = this;
    store.hgetall( 'user', ( err: Error, items: any ) => {
      var userList = _.object( _.keys(items), _.map( _.values(items), (item) => JSON.parse(item) ) );
      self.ok(respond, { users: userList }  );
    });
  },

  resources : [ {
      name: 'user',
      view: 'user',
      layout: 'layout',
      urlParameters: [ 'idx' ],
      // POST method: save a user
      onPost: function( query: any, userData: any, respond: relaxjs.DataCallback ) {
        var self = this;
        var newKey = genGuid();
        userData['userId'] = newKey;
        store.hset('user', newKey, JSON.stringify(userData) );
        store.save();
        self.redirect(respond,'/users',userData);
      },

      // GET method: retrieve a user
      onGet: function( query: any, respond: relaxjs.DataCallback  ) {
        var self = this;
        var userid = self._parameters.idx; // query['id'];
        store.hget( 'user',userid, function( err: Error, data: string ) {
          if ( data ) {
            self.ok(respond, JSON.parse(data))
          }
          else {
            var errMsg = 'Could not find User with id: '+userid;
            var respError = new relaxjs.rxError.RxError(errMsg,'User not found',404);
            self.fail(respond, respError );
          }
        });
      },

      // DELETE : remove a given user
      onDelete: function( query: any, respond: relaxjs.DataCallback  ) {
        var self = this;
        var userid = self._parameters.idx; // query['id'];
        store.hdel( 'user', userid, function( err: Error, data: string ) {
          if ( !err ) {
            self.redirect(respond,'/users');
          }
          else {
            var errMsg = 'Could not find User with id: '+userid;
            var respError = new relaxjs.rxError.RxError(errMsg,'User not found',404);
            self.fail(respond, respError );
          }
        });
      },

      resources : [ {
        name: 'edit',
        view: 'edituser',
        layout: 'layout',
        urlParameters: [ 'idx' ],
        onGet: function( query: any, respond: relaxjs.DataCallback  ) {
          var self = this;
          var userid = self._parameters.idx; // query['id'];
          store.hget( 'user',userid, function( err: Error, data: string ) {
            if ( data ) {
              self.ok( respond, JSON.parse(data) );
            }
            else {
              var errMsg = 'Could not find User with id: '+userid;
              var respError = new relaxjs.rxError.RxError(errMsg,'User not found',404);
              self.fail(respond, respError );
            }
          });
        },

        // PATCH: Editing an existing user
        onPatch: function( query: any, userData: any, respond: relaxjs.DataCallback  ) {
          var self = this;
          var userid = self._parameters.idx;
          userData['userId'] = userid;
          console.log(userData);
          store.hset('user', userid, JSON.stringify(userData), function( err: Error, data: string ) {
            if (!err) {
              store.save();
              self.redirect(respond,'/users');
            }
            else {
              var errMsg = 'Could not Save User with id: '+userid;
              var respError = new relaxjs.rxError.RxError(errMsg,'User could not be updated found');
              self.fail(respond, respError );
            }
          });
        }
      }]
    }
  ]
}

mysite.add( usersResource );
mysite.setHome('/users');

mysite.serve().listen(3000);
