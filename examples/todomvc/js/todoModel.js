/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
var app = app || {};

(function () {
	'use strict';

	var Utils = app.Utils;
	// Generic "model" object. You can use whatever
	// framework you want. For this application it
	// may not even be worth separating this logic
	// out, but we do this to demonstrate one way to
	// separate out parts of your application.
	app.TodoModel = function ( key, cb ) {
		// We read all todos here : GET /todos
		var self = this;
		self.onChanges = [];
		self.key = key;
		$.ajax({
				url: '/todos',
				mimeType: 'application/json',
				type: 'GET'
			})
			.done( function(todos) {
				//alert( JSON.stringify(todos));
				self.todos = todos.all; // Utils.store(key);
				cb();
			});
	};

	app.TodoModel.prototype.subscribe = function (onChange) {
		this.onChanges.push(onChange);
	};

	app.TodoModel.prototype.inform = function () {
		// here we are saving all todos in local storage - not needed since they are saved in the back-end
		Utils.store(this.key, this.todos);
		this.onChanges.forEach(function (cb) { cb(); });
	};

	app.TodoModel.prototype.addTodo = function (title) {
		// Post a single new todo here:
		// POST /todos/todo body:< { id: Utils.uuid(), title: title, completed: false }
		var self = this;
		$.ajax({
			url: '/todos/todo',
			mimeType: 'application/json',
			type: 'POST',
			data: { completed: false, title : title }
		})
		.done( function( data ) {
			// alert( JSON.stringify(data) );
			self.todos = [ data.todo ].concat( self.todos );
			self.inform();
		});
			/*
			id: Utils.uuid(),
			title: title,
			completed: false
		});
		*/
	};

	app.TodoModel.prototype.toggleAll = function (checked) {
		// Note: it's usually better to use immutable data structures since they're
		// easier to reason about and React works very well with them. That's why
		// we use map() and filter() everywhere instead of mutating the array or
		// todo items themselves.

		// This toggle all the todos. Saving is done by the inform() function.
		// In our implementation we need a single PUT to the server to perform the same operation:
		// PUT /todos body: { completed: checked }
		this.todos = this.todos.map(function (todo) {
			return Utils.extend({}, todo, {completed: checked});
		});

		this.inform();
	};

	app.TodoModel.prototype.toggle = function (todoToToggle) {
		// Here we modify a single todo (change che done toggle):
		// PUT /todos/todo/<todoToToggle.id> body: { completed: !todo.completed }
		var self = this;
		var newComplete = !(todoToToggle.completed);
		$.ajax({
			url: '/todos/todo/'+todoToToggle.id,
			mimeType: 'application/json',
			type: 'PATCH',
			data: { completed: newComplete, title : todoToToggle.title }
		})
		.done( function( res ) {
			self.todos = self.todos.map(function (todo) {
				return todo.id !== todoToToggle.id ? todo : res.data.todo ;
			});
			console.log(self.todos);
			self.inform();
		});
	};

	app.TodoModel.prototype.destroy = function (todo) {
		// Here we remove a specific todo :
		// DELETE /todos/todo/<todo.id>
		this.todos = this.todos.filter(function (candidate) {
			return candidate !== todo;
		});

		this.inform();
	};

	app.TodoModel.prototype.save = function (todoToSave, text) {
		this.todos = this.todos.map(function (todo) {
			return todo !== todoToSave ? todo : Utils.extend({}, todo, {title: text});
		});

		this.inform();
	};

	app.TodoModel.prototype.clearCompleted = function () {
		// modifiy the complete flag for an existing todo
		// PUT /todos/todo/<todo.id>  body: { completed: false }
		this.todos = this.todos.filter(function (todo) {
			return !todo.completed;
		});

		this.inform();
	};

})();
