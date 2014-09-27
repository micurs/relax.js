///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var fs = require('fs');
var Q = require('q');

var _ = require("underscore");

// Application Resources
(function (Resources) {
    function get(filename) {
        var laterAction = Q.defer();
        var staticFile = '.' + filename;
        console.log('[static get] Reading file: ' + staticFile);
        fs.readFile(staticFile, function (err, content) {
            if (err)
                laterAction.reject(filename + ' not found');
            else
                console.log('[static get] OK! ');
            laterAction.resolve(content);
        });
        return laterAction.promise;
    }
    Resources.get = get;

    var Home = (function () {
        function Home(msg) {
            this.msg = msg;
        }
        Home.prototype.get = function () {
            var self = this;
            var laterAction = Q.defer();
            var template = "./src/home._";
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
        return Home;
    })();
    Resources.Home = Home;
})(exports.Resources || (exports.Resources = {}));
var Resources = exports.Resources;
