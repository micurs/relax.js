var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require("http");
var fs = require("fs");
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var internals = require('./internals');
var routing = require('./routing');
exports.routing = routing;
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
        if (this.data.length > 1024)
            console.log(_.str.sprintf('[serve] %s Kb', _.str.numberFormat(this.data.length / 1024, 1)));
        else
            console.log(_.str.sprintf('[serve] %s bytes', _.str.numberFormat(this.data.length)));
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
    Container.prototype.add = function (typeName, newRes) {
        newRes['_version'] = site().version;
        newRes['siteName'] = site().siteName;
        var resourcePlayer = new DynamicHtml(newRes);
        resourcePlayer.setName(typeName);
        var indexName = _.str.slugify(typeName);
        var childArray = this._resources[indexName];
        if (childArray === undefined)
            this._resources[indexName] = [resourcePlayer];
        else {
            childArray.push(resourcePlayer);
        }
        console.log(_.str.sprintf('- "%s" [%d] (%s)', typeName, this._resources[indexName].length, indexName));
    };
    Container.prototype.getByIdx = function (name, idx) {
        return this._resources[name][idx];
    };
    Container.prototype.childTypeCount = function (typeName) {
        return this._resources[typeName].length;
    };
    Container.prototype.childCount = function () {
        var counter = 0;
        _.each(this._resources, function (arrayItem) {
            counter += arrayItem.length;
        });
        return counter;
    };
    Container.prototype.getDirection = function (route) {
        var ctx = '[Container.getDirection]';
        var direction = new routing.Direction();
        direction.route = route.stepThrough(1);
        var childResName = direction.route.getNextStep();
        console.log(_.str.sprintf('%s following the next step in: "%s" ', ctx, direction.route.path));
        if (childResName in this._resources) {
            var childResCount = this.childTypeCount(childResName);
            if (childResCount == 1) {
                console.log(_.str.sprintf('%s ONLY ONE matching "%s" ', ctx, childResName));
                direction.resource = this.getFirstMatching(childResName);
            }
            else if (childResCount > 1) {
                var idx = 0;
                if (direction.route.path[1] !== undefined) {
                    idx = parseInt(direction.route.path[1]);
                    if (isNaN(idx)) {
                        idx = 0;
                    }
                    else {
                        direction.route = direction.route.stepThrough(1);
                    }
                }
                console.log(_.str.sprintf('%s [%s] matching "%s" ', ctx, idx, childResName));
                direction.resource = this.getByIdx(childResName, idx);
            }
        }
        return direction;
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
    Site.$ = function (name) {
        if (Site._instance === null && name) {
            Site._instance = new Site(name);
        }
        return Site._instance;
    };
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
    Site.prototype.serve = function () {
        var _this = this;
        return http.createServer(function (msg, response) {
            var route = routing.fromUrl(msg);
            _this.get(route).then(function (rep) {
                rep.serve(response);
            }).fail(function (error) {
                response.writeHead(404, { "Content-Type": "text/html" });
                response.write('Relax.js<hr/>');
                response.write(error);
                response.end();
            }).done();
        });
    };
    Site.prototype.get = function (route) {
        var ctx = '[' + this.name() + '.get] ';
        if (route.static) {
            return internals.viewStatic(route.pathname);
        }
        else {
            if (route.path.length > 1) {
                var direction = this.getDirection(route);
                if (direction.resource) {
                    console.log(_.str.sprintf('%s "%s"', ctx, direction.resource.name()));
                    return direction.resource.get(direction.route);
                }
                else {
                    return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid in request "%s"', ctx, route.pathname), route.pathname);
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
var DynamicHtml = (function (_super) {
    __extends(DynamicHtml, _super);
    function DynamicHtml(res) {
        _super.call(this);
        this._name = '';
        this._template = '';
        this._name = res.view;
        this._template = res.view;
        this._layout = res.layout;
        if (res.onGet)
            this._dataGetter = res.onGet;
        if (res.data)
            for (var attrname in res.data) {
                this[attrname] = res.data[attrname];
            }
    }
    DynamicHtml.prototype.name = function () {
        return this._name;
    };
    DynamicHtml.prototype.setName = function (newName) {
        this._name = newName;
    };
    DynamicHtml.prototype.get = function (route) {
        var ctx = _.str.sprintf('[HtmlView.%s] get', this._template);
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource)
                return direction.resource.get(direction.route);
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        else {
            var dyndata = {};
            if (this._dataGetter) {
                console.log(_.str.sprintf('%s getting resource from callback', ctx));
                dyndata = this._dataGetter();
            }
            if (dyndata) {
                for (var attrname in dyndata) {
                    this[attrname] = dyndata[attrname];
                }
            }
            return internals.viewDynamic(this._template, this, this._layout);
        }
    };
    DynamicHtml.prototype.post = function (route) {
        var contextLog = '[' + this.name() + '.get] ';
        var laterAction = Q.defer();
        return laterAction.promise;
    };
    return DynamicHtml;
})(Container);
var Data = (function (_super) {
    __extends(Data, _super);
    function Data(name) {
        _super.call(this);
        this._name = '';
        this._name = name;
    }
    Data.prototype.name = function () {
        return this._name;
    };
    Data.prototype.setName = function (newName) {
        this._name = newName;
    };
    Data.prototype.get = function (route) {
        var later = Q.defer();
        var readFile = Q.denodeify(fs.readFile);
        var dataFile = './data/' + this.name() + '.json';
        readFile(dataFile).then(function (content) {
            later.resolve(new Embodiment(content, 'application/json'));
        }).catch(function (err) {
            later.reject(internals.emitCompileViewError('N/A', err, dataFile));
        });
        return later.promise;
    };
    Data.prototype.post = function (route) {
        var contextLog = '[' + this.name() + '.get] ';
        var laterAction = Q.defer();
        return laterAction.promise;
    };
    return Data;
})(Container);
function site(name) {
    return Site.$(name);
}
exports.site = site;
