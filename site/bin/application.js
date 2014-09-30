///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
// System and third party import
var fs = require('fs');
var Q = require('q');
var mime = require('mime');
var _ = require("underscore");

// Application Resources
(function (Resources) {
    var Embodiment = (function () {
        function Embodiment() {
        }
        return Embodiment;
    })();
    Resources.Embodiment = Embodiment;

    

    // generic get for a static file
    function viewStatic(filename) {
        var mtype = mime.lookup(filename);
        var laterAction = Q.defer();
        var staticFile = '.' + filename;
        console.log('[static view] ' + staticFile);
        fs.readFile(staticFile, function (err, content) {
            if (err)
                laterAction.reject(filename + ' not found');
            else
                console.log('[static view] done');
            laterAction.resolve({ data: content, mimeType: mtype });
        });
        return laterAction.promise;
    }
    Resources.viewStatic = viewStatic;

    // Return a promise that will return the full content of the view + the viewdata.
    function view(viewName, viewData) {
        var laterAct = Q.defer();
        var templateFilename = './views/' + viewName + '._';
        console.log('[view] template: "' + viewName + '"\t\tdata:' + JSON.stringify(viewData));
        console.log('[view] template file name: "' + templateFilename + '" ');
        fs.readFile(templateFilename, 'utf-8', function (err, content) {
            if (err) {
                console.log('[View] File ' + templateFilename + ' not found');
                laterAct.reject('[View] File ' + templateFilename + ' not found');
            } else {
                console.log('[View] Compiling ' + templateFilename);

                // TODO: Error management needed here
                var compiled = _.template(content);
                var fullContent = new Buffer(compiled(viewData), 'utf-8');
                console.log('[View] done.');
                laterAct.resolve({ data: fullContent, mimeType: 'utf-8' });
            }
        });
        return laterAct.promise;
    }
    Resources.view = view;

    // Root object for the application is the Site.
    // The site is in itself a Resource and is accessed via the root / in a url.
    var Site = (function () {
        function Site() {
            this._name = 'home';
            this._version = '0.0.1';
            if (Site._instance) {
                throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            Site._instance = this;
        }
        Site.$ = function () {
            if (Site._instance === null) {
                Site._instance = new Site();
            }
            return Site._instance;
        };

        Site.prototype.get = function (route) {
            var contextLog = '[' + this._name + '.get] ';
            console.log(contextLog + 'Fetching the resource : [ ' + route.path + ' ]');

            if (route.static) {
                console.log(contextLog + 'Static Route -> fetching the file: ' + route.pathname);
                return viewStatic(route.pathname);
            } else {
                console.log(contextLog + 'Dynamic Route -> follow the path');
                return view(this._name, this);
            }
        };
        Site._instance = null;
        return Site;
    })();
    Resources.Site = Site;

    var Home = (function () {
        function Home(msg) {
            this.msg = msg;
        }
        Home.prototype.get = function () {
            // Here we compute/fetch/create the view data.
            return view('home', this);
        };
        return Home;
    })();
    Resources.Home = Home;
})(exports.Resources || (exports.Resources = {}));
var Resources = exports.Resources;
