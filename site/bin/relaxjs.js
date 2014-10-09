///<reference path='./../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
/*
* Dependencies
*/
var fs = require('fs');
var http = require("http");
var url = require('url');
var path = require('path');
var Q = require('q');
var mime = require('mime');
var _ = require("underscore");
_.str = require('underscore.string');

// Internal function to emit error/warning messages
// ------------------------------------------------------------------------------
function emitCompileViewError(content, err, filename) {
    var fname = '[view error]';
    var errTitle = _.str.sprintf('<h1>%s Error while compiling: %s </h1>', fname, filename);
    var errMsg = _.str.sprintf('<p style="font-weight:bold;">Error: <span style="color:red;">%s</span></p>', _.escape(err.message));
    var code = _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>', _.escape(content));
    return _.str.sprintf('%s%s%s', errTitle, errMsg, code);
}

// ===================================================================================
(function (Routing) {
    var Route = (function () {
        function Route() {
            this.static = true;
        }
        return Route;
    })();
    Routing.Route = Route;

    // --------------------------------------------------------------
    // GET /home/users?id=100
    // becomes
    // home.users.get(100)
    // PUT /home/users?id=100
    // becomes
    //  home.users.put( 100, data)
    // --------------------------------------------------------------
    function fromUrl(request) {
        console.log('[Routing.fromUrl] Original Request: ' + request.url);

        if (!request.url)
            request.url = '/';

        var reqToRoute = url.parse(request.url, true);
        var extension = path.extname(reqToRoute.pathname);
        var resources = reqToRoute.pathname.split('/');
        resources.unshift('site');

        var route = new Route();
        route.pathname = reqToRoute.pathname;
        route.query = reqToRoute.search;
        route.path = _.filter(resources, function (res) {
            return res.length > 0;
        });
        console.log('[Routing.fromUrl] Path (' + route.path.length + ') -> ' + route.path);
        console.log('[Routing.fromUrl] Extension: (' + extension + ')');
        route.static = (extension.length > 0);
        return route;
    }
    Routing.fromUrl = fromUrl;
})(exports.Routing || (exports.Routing = {}));
var Routing = exports.Routing;


// Every resource is converted to their embodiment before they can be served
// ===================================================================================
var Embodiment = (function () {
    function Embodiment(data, mimeType) {
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        response.writeHead(200, { 'Content-Type': this.mimeType, 'Content-Length': this.data.length });
        response.write(this.data);
        response.end();
    };
    return Embodiment;
})();
exports.Embodiment = Embodiment;

// generic get for a static file
// -------------------------------------------------------------------------------
function viewStatic(filename) {
    var fname = '[view static]';
    var mtype = mime.lookup(filename);
    var laterAction = Q.defer();
    var staticFile = '.' + filename;
    console.log(_.str.sprintf('%s %s', fname, staticFile));
    fs.readFile(staticFile, function (err, content) {
        if (err)
            laterAction.reject(filename + ' not found');
        else
            laterAction.resolve(new Embodiment(content, mtype));
    });
    return laterAction.promise;
}
exports.viewStatic = viewStatic;

// Return a promise that will return the full content of the view + the viewdata.
// -------------------------------------------------------------------------------
function view(viewName, viewData, layoutName) {
    var fname = '[view]';
    var readFile = Q.denodeify(fs.readFile);
    var laterAct = Q.defer();
    var templateFilename = './views/' + viewName + '._';
    if (layoutName !== undefined) {
        var layoutFilename = './views/_' + layoutName + '._';
        Q.all([readFile(templateFilename, { 'encoding': 'utf8' }), readFile(layoutFilename, { 'encoding': 'utf8' })]).spread(function (content, outerContent) {
            try  {
                console.log(_.str.sprintf('%s Compiling composite view %s in %s', fname, layoutFilename, templateFilename));
                var innerContent = new Buffer(_.template(content)(viewData), 'utf-8');
                var fullContent = new Buffer(_.template(outerContent)({ page: innerContent, name: viewData.Name }), 'utf-8');
                laterAct.resolve(new Embodiment(fullContent, 'utf-8'));
            } catch (e) {
                laterAct.reject(emitCompileViewError(content, e, templateFilename + ' in ' + layoutFilename));
            }
        }).catch(function (err) {
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename + ' in ' + layoutFilename));
        });
    } else {
        readFile(templateFilename, { 'encoding': 'utf8' }).then(function (content) {
            try  {
                console.log(_.str.sprintf('%s Compiling view %s', fname, templateFilename));
                var fullContent = new Buffer(_.template(content)(viewData), 'utf-8');
                laterAct.resolve(new Embodiment(fullContent, 'utf-8'));
            } catch (e) {
                laterAct.reject(emitCompileViewError(content, e, templateFilename));
            }
        }).catch(function (err) {
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename));
        });
    }
    return laterAct.promise;
}
exports.view = view;

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
// ===================================================================================
var Site = (function () {
    function Site(siteName) {
        this.siteName = siteName;
        this.Name = "site";
        this._resources = {};
        this._version = '0.0.1';
        if (Site._instance) {
            throw new Error("Error: Only one site is allowed.");
        }
        Site._instance = this;
    }
    Site.$ = function (name) {
        if (Site._instance === null) {
            Site._instance = new Site(name);
        }
        return Site._instance;
    };

    Site.prototype.addResource = function (resource) {
        resource['_version'] = this._version;
        resource['siteName'] = this.siteName;
        this._resources[resource.Name] = resource;
        console.log(_.str.sprintf('[addResource] : %s', JSON.stringify(_.keys(this._resources))));
        return false;
    };

    Site.prototype.serve = function (port) {
        var _this = this;
        if (typeof port === "undefined") { port = 3000; }
        return http.createServer(function (request, response) {
            console.log('\n========================');
            console.log('Received request for :' + request.url);

            // here we need to route the call to the appropriate class:
            var route = Routing.fromUrl(request);

            _this.get(route).then(function (rep) {
                rep.serve(response);
            }).fail(function (error) {
                response.writeHead(404, { "Content-Type": "text/html" });
                response.write(error);
                response.end();
            }).done();
        });
    };

    Site.prototype.get = function (route) {
        var contextLog = '[' + this.Name + '.get] ';
        console.log(contextLog + 'Fetching the resource : [ ' + route.path + ' ]');

        if (route.static) {
            console.log(contextLog + 'Static Route -> fetching the file: ' + route.pathname);
            return exports.viewStatic(route.pathname);
        } else {
            console.log(contextLog + 'Dynamic Route -> following the path ');
            if (route.path.length > 1) {
                if (route.path[1] in this._resources) {
                    console.log(contextLog + 'Found resource for ' + route.path[1]);
                    var partialRoute = _.clone(route);
                    partialRoute.path = route.path;
                    return this._resources[route.path[1]].get(partialRoute);
                }
            }

            //var resArray:Resource[] = _.map<any,Resource>( this._resources, function(item, key) { return item; } );
            //var list:string = _.reduce<Resource,string>( _.values(this._resources), (m :string ,item) => m+= "<li>"+item.Name+"</li>"  );
            console.log(contextLog + 'Resources : [ ' + JSON.stringify(_.values(this._resources)) + ' ]');
            return exports.view(this.Name, this);
        }
    };
    Site._instance = null;
    return Site;
})();
exports.Site = Site;

(function (Resources) {
    // ===================================================================================
    var Data = (function () {
        function Data(Name) {
            this.Name = Name;
        }
        Data.prototype.get = function (route) {
            var later = Q.defer();
            var readFile = Q.denodeify(fs.readFile);
            var dataFile = './data/' + this.Name + '.json';
            readFile(dataFile).then(function (content) {
                later.resolve(new Embodiment(content, 'application/json'));
            }).catch(function (err) {
                later.reject(emitCompileViewError('N/A', err, dataFile));
            });
            return later.promise;
        };
        return Data;
    })();
    Resources.Data = Data;

    // ===================================================================================
    var HtmlView = (function () {
        function HtmlView(viewName, layout) {
            this.viewName = viewName;
            this.layout = layout;
            this.Name = "site";
            this.Name = viewName;
        }
        HtmlView.prototype.get = function (route) {
            var contextLog = '[' + this.Name + '.get] ';
            console.log(contextLog + 'Fetching the resource : [ ' + route.path + ' ]');

            // Here we compute/fetch/create the view data.
            return exports.view(this.Name, this, this.layout);
        };
        return HtmlView;
    })();
    Resources.HtmlView = HtmlView;
})(exports.Resources || (exports.Resources = {}));
var Resources = exports.Resources;
/*
var relaxjs = {
Route: r.Route,
Embodiment: r.Embodiment
}
export = relaxjs;
*/
