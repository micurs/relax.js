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
    Container.prototype.addResource = function (typeName, res) {
        var childArray = this._resources[typeName];
        if (childArray === undefined)
            this._resources[typeName] = [res];
        else
            childArray.push(res);
    };
    return Container;
})();
exports.Container = Container;
var Site = (function (_super) {
    __extends(Site, _super);
    function Site(siteName) {
        _super.call(this);
        this.siteName = siteName;
        this._name = "site";
        this._version = '0.0.1';
        if (Site._instance) {
            throw new Error("Error: Only one site is allowed.");
        }
        Site._instance = this;
    }
    Site.prototype.name = function () {
        return this._name;
    };
    Site.$ = function (name) {
        if (Site._instance === null) {
            Site._instance = new Site(name);
        }
        return Site._instance;
    };
    Site.prototype.serve = function () {
        var _this = this;
        return http.createServer(function (msg, response) {
            console.log('\n');
            var rxReq = new Request();
            rxReq.route = routing.fromUrl(msg);
            _this.get(rxReq).then(function (rep) {
                rep.serve(response);
            }).fail(function (error) {
                response.writeHead(404, { "Content-Type": "text/html" });
                response.write(error);
                response.end();
            }).done();
        });
    };
    Site.prototype.get = function (req) {
        var contextLog = '[' + this.name() + '.get] ';
        if (req.route.static) {
            console.log(contextLog + 'Static -> ' + req.route.pathname);
            return internals.viewStatic(req.route.pathname);
        }
        else {
            console.log(contextLog + 'Dynamic -> following the path... ');
            if (req.route.path.length > 1) {
                if (req.route.path[1] in this._resources) {
                    console.log(contextLog + 'Found Resource for ' + req.route.path[1]);
                    var innerReq = _.clone(req);
                    var childTypename = req.route.path[1];
                    var childResource = _super.prototype.getFirstMatching.call(this, childTypename);
                    return childResource.get(innerReq);
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
