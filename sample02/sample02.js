///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/Q.d.ts' />
///<reference path='typings/underscore/underscore.d.ts' />
///<reference path='typings/underscore.string/underscore.string.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var relaxjs = require('relaxjs');
// Create a Resource class
var Users = (function () {
    function Users() {
        this._resources = {};
        this._name = 'users';
    }
    Users.prototype.name = function () {
        return this._name;
    };
    Users.prototype.get = function (route) {
        var later = Q.defer();
        return later.promise;
    };
    Users.prototype.addResource = function (res) {
        return false;
    };
    return Users;
})();
var User = (function () {
    function User(firstName, lastName) {
        this.firstName = firstName;
        this.lastName = lastName;
        this._name = 'N/A';
        this._name = _.str.sprintf('%s %s', firstName, lastName);
    }
    User.prototype.name = function () {
        return this._name;
    };
    User.prototype.get = function (route) {
        var later = Q.defer();
        return later.promise;
    };
    User.prototype.addResource = function (res) {
        return false;
    };
    return User;
})();
// Create the application by assembling the resources
var mysite = relaxjs.site('micurs.com');
// Create the application by assembling the resources
mysite.addResource(new relaxjs.resources.HtmlView('home', 'layout'));
var myusers = new Users();
myusers.addResource(new User('John', 'Smith'));
myusers.addResource(new User('Joe', 'Doe'));
myusers.addResource(new User('Mary', 'Linn'));
myusers.addResource(new User('Tracy', 'Stwart'));
mysite.addResource(myusers);
var appSrv = mysite.serve();
appSrv.listen(3000);
