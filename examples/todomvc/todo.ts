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
  data: { version: '0.1.4' }
});


todosite.add( {
  name: 'todos',

  // Returns all the todos
  onGet: function( query: any, resp: r.Response  ) {
    var self = this;
    store.hgetall( 'todos', ( err: Error, items: any ) => {
      console.log(items);
      if ( err ) {
        resp.fail( new r.RxError( 'Could not retrieve Todos',err.message, 404 ) );
      }
      else {
        this.data.version = '0.1.4';
        this.data.all = _.map( _.values(items), (item) =>  JSON.parse(item)  );
        resp.ok();
      }
    });
  },

  // Update all todos
  onPatch: function( query: any, target: any, resp: r.Response ) {
    var self = this;
    console.log('PATCH ALL >> ============================');
    console.log(target);
    store.hgetall( 'todos', (err: Error, items )=> {
      if ( err ) {
        var respError = new r.RxError(err.message,'Redis cannot find Hash "todos"',404);
        resp.fail( respError );
      }
      else {
        var todos = _.map( _.values(items), (item) =>  JSON.parse(item)  );
        console.log(todos);
        var newTodos = _.map( todos, (todo) => {
            return { id: todo.id,
              title: todo.title,
              completed: target.completed=='true'?true:false };
          });
        _.each( newTodos, (todo) => {
            console.log('   SAVE >> ---------- ');
            console.log(todo);
            store.hset('todos',todo.id, JSON.stringify(todo));
          });
        store.save();
        this.data.all = newTodos;
        resp.ok();
      }
    });
  },

  resources: [
    {
      name: 'todo',
      urlParameters: [ 'id' ],

      // Add a new todo into the store
      onPost: function( query: any, todo: any, resp: r.Response ) {
        var self = this;
        var newId = genGuid();
        todo.id = newId;
        todo.completed = ( todo.completed == 'true') ? true : false;
        store.hset('todos', newId, JSON.stringify(todo) );
        store.save();
        this.data.todo = todo
        resp.ok();
      },

      // Modify an existing todo into the store
      onPatch: function( query: any, todo: any, resp: r.Response ) {
        var self = this;
        var idToChange = self._parameters['id'];
        store.hget('todos',idToChange, function( err: Error, item: any ){
          if ( err ) {
            var respError = new r.RxError(err.message,'Could not update the exisitng Todo',404);
            resp.fail( respError );
          }
          else {
            var savedTodo = JSON.parse(item);
            var currTodo: Todo = {
              id: idToChange,
              completed: todo.completed == 'true' ? true : false,
              title: todo.title };
            store.hset('todos', currTodo.id, JSON.stringify(currTodo) );
            store.save();
            self.data.todo = currTodo;
            resp.ok();
          }
        });
      },

      // Retrieve a specific todo from the store
      onGet: function( query: any, resp : r.Response ) {
        var self = this;
        var id = self._parameters.id; // query['id'];
        store.hget(
          'todos',
          id,
          ( err: Error, data: string ) => {
            if ( err ) {
              var respError = new r.RxError(err.message,'Todo not found',404);
              resp.fail(respError );
            }
            else {
              self.data.todo = JSON.parse(data);
              resp.ok();
            }
          });
      },

      // Delete a specific todo from the strore
      onDelete: function( query: any, resp: r.Response ) {
        var self = this;
        var idToDelete = self._parameters['id'];
        store.hdel('todos',idToDelete, ( err: Error, data: any ) => {
          if ( err ) {
            var respError = new r.RxError(err.message,'Todo not found',404);
            resp.fail( respError );
          }
          else {
            self.data.todo = JSON.parse(data);
            resp.ok()
          }
        });
      }
    }

  ]
});

todosite.setHome('/todo');
todosite.serve().listen(3000);
