// Relax.js example #4

///<reference path='typings/redis/redis.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import _ = require("underscore");
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
// store.del('user');
// store.save();

// Create the application by assembling the resources
var mysite = relaxjs.site('Example #4');

// Create a resource that can retrieve and store users info into redis
var usersResource : relaxjs.Resource = {
  name: 'users',
  view: 'users',
  layout: 'layout',
  onGet: ( query: any, respond: relaxjs.DataCallback  ) => {
    //var ucount = this.childTypeCount('user');
    //console.log('Get users list: '+ucount+' items.');
    store.hgetall( 'user', ( err: Error, items: any ) => {
      var userList = _.object( _.keys(items), _.map( _.values(items), (item) => JSON.parse(item) ) );
      console.log( JSON.stringify(userList,null, ' '));
      respond( null, { data: { users: userList } } );
    });
  },
  resources : [ {
      name: 'user',
      view: 'user',
      layout: 'layout',

      /*
       * POST method: save a user
      */
      onPost: function( query: any, userData: any, respond: relaxjs.DataCallback ) {
        var newKey = genGuid();
        userData['userId'] = newKey;
        store.hset('user', newKey, JSON.stringify(userData) );
        store.save();
        respond( null, { result: 'ok', httpCode: 303, location: '/users' , data: userData } );
      },

      /*
       * -- GET method: retrieve a user
      */
      onGet: function( query: any, respond: relaxjs.DataCallback  ) {
        var userid = query['id'];
        store.hget( 'user',userid, function( err: Error, data: string ) {
          if ( data ) {
            respond( null, { data: JSON.parse(data) } );
          }
          else {
            var errMsg = 'Could not find User with id: '+userid;
            var respError = new relaxjs.RxError(errMsg,'User not found',404);
            respond( respError );
          }
        });
      }
    }
  ]
}

mysite.add( usersResource );

mysite.serve().listen(3000);
