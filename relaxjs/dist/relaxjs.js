var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require("http");
var querystring = require('querystring');
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
    Container.prototype.add = function (newRes) {
        newRes['_version'] = site().version;
        newRes['siteName'] = site().siteName;
        var resourcePlayer = new ResourceServer(newRes);
        var indexName = _.str.slugify(newRes.name);
        var childArray = this._resources[indexName];
        if (childArray === undefined)
            this._resources[indexName] = [resourcePlayer];
        else {
            childArray.push(resourcePlayer);
        }
        console.log(_.str.sprintf('new resource: "%s" [%d] (%s)', newRes.name, this._resources[indexName].length - 1, indexName));
    };
    Container.prototype.getByIdx = function (name, idx) {
        return this._resources[name][idx];
    };
    Container.prototype.childTypeCount = function (typeName) {
        if (this._resources[typeName])
            return this._resources[typeName].length;
        else
            return 0;
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
        console.log('\n');
        return http.createServer(function (msg, response) {
            var route = routing.fromUrl(msg);
            var site = _this;
            console.log(msg.method);
            switch (msg.method) {
                case 'POST':
                    {
                        var body = '';
                        msg.on('data', function (data) {
                            body += data;
                        });
                        msg.on('end', function () {
                            console.log("Full Body: " + body);
                            var bodyData = querystring.parse(body);
                            site.post(route, bodyData).then(function (rep) {
                                rep.serve(response);
                            }).fail(function (error) {
                                response.writeHead(404, { "Content-Type": "text/html" });
                                response.write('Relax.js<hr/>');
                                response.write(error);
                                response.end();
                            }).done();
                        });
                    }
                    ;
                    break;
                case 'GET':
                    {
                        site.get(route).then(function (rep) {
                            rep.serve(response);
                        }).fail(function (error) {
                            response.writeHead(404, { "Content-Type": "text/html" });
                            response.write('Relax.js<hr/>');
                            response.write(error);
                            response.end();
                        }).done();
                    }
                    ;
                    break;
            }
        });
    };
    Site.prototype.get = function (route) {
        var ctx = '[' + this.name() + '.get] ';
        console.log(ctx + ' route:' + route.path);
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
    Site.prototype.post = function (route, body) {
        var ctx = '[site.post] ';
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                console.log(_.str.sprintf('%s "%s"', ctx, direction.resource.name()));
                return direction.resource.post(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid in request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        return internals.promiseError(_.str.sprintf('%s ERROR Invalid in request "%s"', ctx, route.pathname), route.pathname);
    };
    Site._instance = null;
    return Site;
})(Container);
exports.Site = Site;
var ResourceServer = (function (_super) {
    __extends(ResourceServer, _super);
    function ResourceServer(res) {
        var _this = this;
        _super.call(this);
        this._name = '';
        this._template = '';
        this._name = res.name;
        this._template = res.view;
        this._layout = res.layout;
        this._onGet = res.onGet ? Q.nbind(res.onGet, this) : undefined;
        this._onPost = res.onPost ? Q.nbind(res.onPost, this) : undefined;
        if (res.resources) {
            _.each(res.resources, function (child, index) {
                _this.add(child);
            });
        }
        if (res.data) {
            _.each(res.data, function (value, attrname) {
                if (attrname != 'resources') {
                    _this[attrname] = value;
                }
            });
        }
    }
    ResourceServer.prototype.name = function () {
        return this._name;
    };
    ResourceServer.prototype.get = function (route) {
        var _this = this;
        var ctx = _.str.sprintf('[get]');
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
            if (this._onGet) {
                var later = Q.defer();
                console.log(_.str.sprintf('%s Calling onGet()!', ctx));
                this._onGet(route.query).then(function (data) {
                    console.log(_.str.sprintf('%s Got data from callback: ', ctx, JSON.stringify(data)));
                    var dyndata = data;
                    if (dyndata) {
                        for (var attrname in dyndata) {
                            _this[attrname] = dyndata[attrname];
                        }
                    }
                    if (_this._template) {
                        console.log(_.str.sprintf('%s View "%s" as HTML using %s', ctx, _this._name, _this._template));
                        internals.viewDynamic(_this._template, _this, _this._layout).then(function (emb) {
                            later.resolve(emb);
                        });
                    }
                    else {
                        console.log(_.str.sprintf('%s View "%s" as JSON.', ctx, _this._name));
                        internals.viewJson(_this).then(function (emb) {
                            later.resolve(emb);
                        });
                    }
                });
                return later.promise;
            }
            else {
                console.log(_.str.sprintf('%s getting resource from the data ', ctx));
                if (this._template) {
                    console.log(_.str.sprintf('%s View "%s" as HTML using %s', ctx, this._name, this._template));
                    return internals.viewDynamic(this._template, this, this._layout);
                }
                else {
                    console.log(_.str.sprintf('%s View "%s" as JSON.', ctx, this._name));
                    return internals.viewJson(this);
                }
            }
        }
    };
    ResourceServer.prototype.post = function (route, body) {
        var _this = this;
        var ctx = '[post] ';
        var laterAction = Q.defer();
        var thisRes = this;
        if (route.path.length > 1) {
            var direction = thisRes.getDirection(route);
            if (direction.resource)
                return direction.resource.post(direction.route, body);
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        else {
            if (this._onPost) {
                var later = Q.defer();
                console.log(_.str.sprintf('%s Calling onPost()!', ctx));
                this._onPost(route.query, body).then(function (data) {
                    var dyndata = data;
                    console.log(_.str.sprintf('%s Post returned %s', ctx, JSON.stringify(dyndata)));
                    _.each(_.keys(dyndata), function (key) {
                        thisRes[key] = dyndata[key];
                    });
                    internals.viewJson(_this).then(function (emb) {
                        later.resolve(emb);
                    });
                });
                return later.promise;
            }
            else {
            }
        }
        return laterAction.promise;
    };
    return ResourceServer;
})(Container);
exports.ResourceServer = ResourceServer;
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
