///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// System and third party import
var fs = require('fs');
var Q = require('q');

var _ = require("underscore");

// Application Resources
(function (Resources) {
    

    // generic get for a static file
    function get(filename) {
        var laterAction = Q.defer();
        var staticFile = '.' + filename;
        fs.readFile(staticFile, function (err, content) {
            if (err)
                laterAction.reject(filename + ' not found');
            else
                console.log('[static get] ' + staticFile);

            // console.log('[static get] OK! ');
            laterAction.resolve(content);
        });
        return laterAction.promise;
    }
    Resources.get = get;

    var ViewResource = (function () {
        function ViewResource(viewName) {
            this.viewName = viewName;
        }
        // Return a promise that will return the full content of the view + the viewdata.
        ViewResource.prototype.view = function (viewData) {
            var laterAct = Q.defer();
            var templateFilename = './views/' + this.viewName + '._';
            fs.readFile(templateFilename, "utf-8", function (err, content) {
                if (err) {
                    laterAct.reject('[ViewResource] File ' + templateFilename + ' not found');
                } else {
                    console.log('[ViewResource] Compiling ' + templateFilename);

                    // TODO: Error management needed here
                    var compiled = _.template(content);
                    var fullContent = compiled(viewData);
                    console.log('[ViewResource] done.');
                    laterAct.resolve(fullContent);
                }
            });
            return laterAct.promise;
        };
        return ViewResource;
    })();
    Resources.ViewResource = ViewResource;

    var Home = (function (_super) {
        __extends(Home, _super);
        function Home(msg) {
            _super.call(this, 'home');
            this.msg = msg;
        }
        Home.prototype.get = function () {
            // Here we compute/fetch/create the view data.
            return _super.prototype.view.call(this, this);
        };
        return Home;
    })(ViewResource);
    Resources.Home = Home;
})(exports.Resources || (exports.Resources = {}));
var Resources = exports.Resources;
