/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
var app = app || {};

(function () {
	'use strict';

	var Utils = app.Utils;

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
		Utils.store(this.key, this.todos);
		this.onChanges.forEach(function (cb) { cb(); });
	};

	app.TodoModel.prototype.toggleAll = function (checked) {
		// This toggle all the todos.
		// In our implementation we use a single PATCH call to the server to
		// perform a global update.
		// PATCH /todos body: { completed: checked }
		var self = this;
		var newComplete = checked;
		$.ajax({
			url: '/todos',
			mimeType: 'application/json',
			type: 'PATCH',
			data: { completed: newComplete }
		})
		.done( function( todos ) {
			console.log(todos.all);
			self.todos = todos.all;
			self.inform();
		});
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
	};

	app.TodoModel.prototype.toggle = function (todoToToggle) {
		// Here we modify a single todo (change che done toggle):
		// PUT /todos/todo/<todoToToggle.id> body: { completed: !todo.completed }
		var self = this;
		var newComplete = !(todoToToggle.completed);
		var urlCall = '/todos/todo/'+todoToToggle.id;
		console.log('PATCH to '+urlCall);
		$.ajax({
			url: urlCall,
			mimeType: 'application/json',
			type: 'PATCH',
			data: { completed: newComplete, title : todoToToggle.title }
		})
		.done( function( res ) {
			//alert( JSON.stringify(res,null,' '));
			self.todos = self.todos.map(function (todo) {
				return todo.id !== todoToToggle.id ? todo : res.todo ;
			});
			self.inform();
		});
	};

	app.TodoModel.prototype.destroy = function (todoToDelete) {
		// Here we remove a specific todo :
		// DELETE /todos/todo/<todo.id>
		var self = this;
		$.ajax({
			url: '/todos/todo/'+todoToDelete.id,
			mimeType: 'application/json',
			type: 'DELETE'
		})
		.done( function( res ) {
			self.todos = self.todos.filter(function (todo) {
				return todo.id !== todoToDelete.id;
			});
			self.inform();
		});
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
