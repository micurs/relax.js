///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
var fs = require('fs');
var Q = require('q');

var _ = require("underscore");

// Application Resources
(function (resources) {
    var home = (function () {
        function home(msg) {
            this.msg = msg;
        }
        home.prototype.get = function () {
            var self = this;
            var laterAction = Q.defer();
            var template = __dirname + '/../src/home._';
            console.log('Reading file: ' + template);
            fs.readFile(template, "utf-8", function (err, content) {
                if (err) {
                    laterAction.reject("File home._ not found");
                } else {
                    console.log("Compiling ...");
                    var compiled = _.template(content);
                    var fullContent = compiled(self);
                    console.log("done.");
                    laterAction.resolve(fullContent);
                }
            });
            return laterAction.promise;
        };
        return home;
    })();
    resources.home = home;
})(exports.resources || (exports.resources = {}));
var resources = exports.resources;
