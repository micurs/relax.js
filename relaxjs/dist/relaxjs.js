var http = require("http");
var _ = require("underscore");
_.str = require('underscore.string');
var internals = require('./internals');
var routing = require('./routing');
var resources = require('./resources');
exports.routing = routing;
exports.resources = resources;
function relax() {
    console.log('relax');
}
exports.relax = relax;
var Embodiment = (function () {
    function Embodiment(data, mimeType) {
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        console.log('[serve] lenght:' + this.data.length);
        response.writeHead(200, { 'Content-Type': this.mimeType, 'Content-Length': this.data.length });
        response.write(this.data);
        response.end();
    };
    return Embodiment;
})();
exports.Embodiment = Embodiment;
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
        if (port === void 0) { port = 3000; }
        console.log('Site ' + this.siteName + ' listening on port:' + port);
        return http.createServer(function (request, response) {
            console.log('\n========================');
            var route = routing.fromUrl(request);
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
        if (route.static) {
            console.log(contextLog + 'Static -> ' + route.pathname);
            return internals.viewStatic(route.pathname);
        }
        else {
            console.log(contextLog + 'Dynamic -> following the path... ');
            if (route.path.length > 1) {
                if (route.path[1] in this._resources) {
                    console.log(contextLog + 'Found Resource for ' + route.path[1]);
                    var partialRoute = _.clone(route);
                    partialRoute.path = route.path;
                    return this._resources[route.path[1]].get(partialRoute);
                }
            }
            return internals.viewDynamic(this.Name, this);
        }
    };
    Site._instance = null;
    return Site;
})();
exports.Site = Site;
