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
  onGet: function( query: any, respond: relaxjs.Response  ) {
    var self = this;
    store.hgetall( 'user', ( err: Error, items: any ) => {
      var userList = _.object( _.keys(items), _.map( _.values(items), (item) => JSON.parse(item) ) );
      self.data = { users: userList };
      respond.ok();
    });
  },

  resources : [ {
      name: 'user',
      view: 'user',
      layout: 'layout',
      urlParameters: [ 'idx' ],

      // POST: save a user
      onPost: function( query: any, userData: any, respond: relaxjs.Response ) {
        var self = this;
        var newKey = genGuid();
        userData['userId'] = newKey;
        store.hset('user', newKey, JSON.stringify(userData) );
        store.save();
        respond.redirect('/users');
      },

      // GET: retrieve a user
      onGet: function( query: any, respond: relaxjs.Response  ) {
        var self = this;
        var userid = self._parameters.idx; // query['id'];
        store.hget( 'user',userid, function( err: Error, data: string ) {
          if ( data ) {
            self.data = JSON.parse(data);
            respond.ok();
          }
          else {
            var errMsg = 'Could not find User with id: '+userid;
            var respError = new relaxjs.RxError(errMsg,'User not found',404);
            respond.fail(respError );
          }
        });
      },

      // DELETE: remove a given user
      onDelete: function( query: any, respond: relaxjs.Response  ) {
        var self = this;
        var userid = self._parameters.idx; // query['id'];
        store.hdel( 'user', userid, function( err: Error, data: string ) {
          if ( !err ) {
            respond.redirect('/users');
          }
          else {
            var errMsg = `Could not find User with id: ${userid}`;
            var respError = new relaxjs.RxError(errMsg,'User not found',404);
            respond.fail(respError);
          }
        });
      },

      resources : [ {
        name: 'edit',
        view: 'edituser',
        layout: 'layout',
        urlParameters: [ 'idx' ],

        // GET: user editor page
        onGet: function( query: any, respond: relaxjs.Response  ) {
          var self = this;
          var userid = self._parameters.idx; // query['id'];
          store.hget( 'user',userid, function( err: Error, data: string ) {
            if ( data ) {
              self.data = JSON.parse(data);
              respond.ok();
            }
            else {
              var errMsg = 'Could not find User with id: '+userid;
              var respError = new relaxjs.RxError(errMsg,'User not found',404);
              respond.fail(respError);
            }
          });
        },

        // PATCH: Editing an existing user
        onPatch: function( query: any, userData: any, respond: relaxjs.Response  ) {
          var self = this;
          var userid = self._parameters.idx;
          userData['userId'] = userid;
          console.log(userData);
          store.hset('user', userid, JSON.stringify(userData), function( err: Error, data: string ) {
            if (!err) {
              store.save();
              respond.redirect('/users');
            }
            else {
              var errMsg = 'Could not Save User with id: '+userid;
              var respError = new relaxjs.RxError(errMsg,'User could not be updated found');
              respond.fail(respError);
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
