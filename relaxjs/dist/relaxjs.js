var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
var Request = (function () {
    function Request() {
    }
    return Request;
})();
exports.Request = Request;
var Embodiment = (function () {
    function Embodiment(data, mimeType) {
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        console.log('[serve] bytes:' + this.data.length);
        response.writeHead(200, { 'Content-Type': this.mimeType, 'Content-Length': this.data.length });
        response.write(this.data);
        response.end();
    };
    return Embodiment;
})();
exports.Embodiment = Embodiment;
var Container = (function () {
    function Container() {
        this._resources = {};
    }
    Container.prototype.getFirstMatching = function (typeName) {
        var childArray = this._resources[typeName];
        if (childArray === undefined) {
            return null;
        }
        return childArray[0];
    };
    Container.prototype.addResource = function (typeName, newRes) {
        newRes['_version'] = site().version;
        newRes['siteName'] = site().siteName;
        newRes.setName(typeName);
        var childArray = this._resources[typeName];
        if (childArray === undefined)
            this._resources[typeName] = [newRes];
        else {
            childArray.push(newRes);
        }
    };
    Container.prototype.add = function (newRes) {
        newRes['_version'] = site().version;
        newRes['siteName'] = site().siteName;
        var typeName = newRes.name();
        var childArray = this._resources[typeName];
        if (childArray === undefined)
            this._resources[typeName] = [newRes];
        else {
            childArray.push(newRes);
        }
    };
    Container.prototype.getByIdx = function (name, idx) {
        return this._resources[name][idx];
    };
    Container.prototype.childTypeCount = function () {
        return Object.keys(this._resources).length;
    };
    return Container;
})();
exports.Container = Container;
var Site = (function (_super) {
    __extends(Site, _super);
    function Site(siteName) {
        _super.call(this);
        this._name = "site";
        this._version = '0.0.1';
        this._siteName = 'site';
        this._siteName = siteName;
        if (Site._instance) {
            throw new Error("Error: Only one site is allowed.");
        }
        Site._instance = this;
    }
    Site.prototype.name = function () {
        return this._name;
    };
    Site.prototype.setName = function (newName) {
        this._name = newName;
    };
    Object.defineProperty(Site.prototype, "version", {
        get: function () {
            return this._version;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Site.prototype, "siteName", {
        get: function () {
            return this._siteName;
        },
        enumerable: true,
        configurable: true
    });
    Site.$ = function (name) {
        if (Site._instance === null && name) {
            Site._instance = new Site(name);
        }
        return Site._instance;
    };
    Site.prototype.serve = function () {
        var _this = this;
        return http.createServer(function (msg, response) {
            console.log('\n');
            var route = routing.fromUrl(msg);
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
        var contextLog = '[' + this.name() + '.get] ';
        if (route.static) {
            console.log(contextLog + 'Static -> ' + route.pathname);
            return internals.viewStatic(route.pathname);
        }
        else {
            if (route.path.length > 1) {
                var childResource;
                var innerRoute = route.stepThrough(1);
                console.log(_.str.sprintf('%s Dynamic -> following the next step of innerRoute: "%s" ', contextLog, innerRoute.getNextStep()));
                if (innerRoute.getNextStep() in this._resources) {
                    if (this.childTypeCount() == 1) {
                        console.log(_.str.sprintf('%s first matching "%s" ', contextLog, innerRoute.getNextStep()));
                        childResource = this.getFirstMatching(innerRoute.getNextStep());
                    }
                    else if (this.childTypeCount() > 1) {
                        var idx = parseInt(innerRoute.path[1]);
                        console.log(_.str.sprintf('%s %d matching "%s" ', contextLog, idx, innerRoute.getNextStep()));
                        childResource = this.getByIdx(innerRoute.getNextStep(), idx);
                    }
                }
                if (childResource) {
                    console.log(_.str.sprintf('%s Found Resource for "%s" -> %s', contextLog, innerRoute.getNextStep(), childResource.name()));
                    return childResource.get(innerRoute);
                }
                else {
                }
            }
            return internals.viewDynamic(this.name(), this);
        }
    };
    Site.prototype.post = function (req) {
        var contextLog = '[' + this.name() + '.get] ';
        var laterAction = Q.defer();
        return laterAction.promise;
    };
    Site._instance = null;
    return Site;
})(Container);
exports.Site = Site;
function site(name) {
    return Site.$(name);
}
exports.site = site;
