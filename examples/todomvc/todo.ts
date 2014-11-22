// todomvc with React.js (front-end) and Relax.js (back-end) plus redis as datastore

///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='typings/lodash/lodash.d.ts' />
///<reference path='typings/redis/redis.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import _ = require("lodash");
import redis = require("redis");
import r = require('relaxjs');

interface Todo {
  id? : string;
  title: string;
  completed: boolean;
}

function genGuid() : string {
  // from: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
    });
}

var store = redis.createClient();
var todosite = r.site('todomvc');

todosite.add( {
  name: 'todo',
  view: 'index',
  data: { version: '0.1.2' }
});


todosite.add( {
  name: 'todos',

  // Returns all the todos
  onGet: function( query, respond: r.DataCallback  ) {
    var self = this;

    store.hgetall( 'todos', ( err: Error, items: any ) => {
      console.log(items);
      if ( !err ) {
        var todos = _.map( _.values(items), (item) =>  JSON.parse(item)  );
        self.ok(respond, { all: todos }  );
      }
      else {
        self.fail(respond, { error :  JSON.stringify(err) });
      }
    });
  },

  // Update all todos
  onPut: function( query, todoUpdate: any, respond: r.DataCallback ) {
    this.fail(respond, { message : 'not yet implemented'});
  },

  resources: [ {
    name: 'todo',
    urlParameters: [ 'id' ],

    // Add a new todo into the store
    onPost: function( query, todo: any, respond: r.DataCallback  ) {
      var self = this;
      var newId = genGuid();
      todo.id = newId;
      todo.completed = ( todo.completed == 'true') ? true : false;
      store.hset('todos', newId, JSON.stringify(todo) );
      store.save();
      self.ok(respond,{ todo: todo });
    },

    // Modify an existing todo into the store
    onPatch: function( query, todo: any, respond: r.DataCallback  ) {
      var self = this;
      var idToChange = self._parameters['id'];
      store.hget('todos',idToChange, function( err: Error, item: any ){
        if ( err ) {
          self.fail(respond, { redis_error : err } );
        }
        else {
          var currTodo = JSON.parse(item);

          currTodo.id = idToChange;
          currTodo.completed = todo.completed == 'true' ? true : false;
          currTodo.title = todo.title;
          store.hset('todos', currTodo.id, JSON.stringify(currTodo) );
          store.save();

          self.ok(respond, { todo: currTodo } );
          console.log('END PUT ==============================');
        }
      });
    },

    // Retrieve a specific todo from the store
    onGet: function( query, respond : r.DataCallback ) {
      var self = this;
      var id = self._parameters.id; // query['id'];
      store.hget(
        'todos',
        id,
        ( err: Error, data: string ) => {
          if ( data ) {
            self.ok(respond, JSON.parse(data))
          }
          else {
            var errMsg = 'Could not find User with id: '+id;
            var respError = new r.rxError.RxError(errMsg,'Todo not found',404);
            self.fail(respond, respError );
          }
        });
    },

    // Delete a specific todo from the strore
    onDelete: function( query, respond: r.DataCallback  ) {
      var self = this;
      self.fail(respond, { message : 'not yet implemented'});
    }
  }

  ]
});

todosite.serve().listen(3000);
