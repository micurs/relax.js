var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require("http");
var querystring = require('querystring');
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var internals = require('./internals');
var routing = require('./routing');
exports.routing = routing;
function relax() {
    console.log('relax.js !');
}
exports.relax = relax;
var RxError = (function () {
    function RxError(message, name, code, extra) {
        var tmp = new Error();
        this.message = message;
        this.name = name;
        this.httpCode = code;
        this.stack = tmp.stack;
        this.extra = extra;
    }
    RxError.prototype.getHttpCode = function () {
        return this.httpCode;
    };
    RxError.prototype.getExtra = function () {
        return this.extra ? this.extra : '';
    };
    RxError.prototype.toString = function () {
        return _.str.sprintf('RxError %d: %s\n%s\nStack:\n%s', this.httpCode, this.name, this.message, this.stack);
    };
    return RxError;
})();
exports.RxError = RxError;
var Request = (function () {
    function Request() {
    }
    return Request;
})();
exports.Request = Request;
var Embodiment = (function () {
    function Embodiment(mimeType, data) {
        this.httpCode = 200;
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        var headers = { 'Content-Type': this.mimeType };
        if (this.data)
            headers['Content-Length'] = this.data.length;
        if (this.location)
            headers['Location'] = this.location;
        response.writeHead(this.httpCode, headers);
        if (this.data)
            response.write(this.data);
        response.end();
        if (this.data.length > 1024)
            console.log(_.str.sprintf('[serve] %s Kb', _.str.numberFormat(this.data.length / 1024, 1)));
        else
            console.log(_.str.sprintf('[serve] %s bytes', _.str.numberFormat(this.data.length)));
    };
    Embodiment.prototype.dataAsString = function () {
        return this.data.toString('utf-8');
    };
    return Embodiment;
})();
exports.Embodiment = Embodiment;
var Container = (function () {
    function Container(parent) {
        this._resources = {};
        this._parent = parent;
    }
    Object.defineProperty(Container.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    Container.prototype.remove = function (child) {
        var resArr = this._resources[child.name()];
        var idx = _.indexOf(resArr, child);
        if (idx < 0)
            return false;
        resArr.splice(idx, 1);
    };
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
        var resourcePlayer = new ResourcePlayer(newRes, this);
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
    function Site(siteName, parent) {
        _super.call(this, parent);
        this._name = "site";
        this._version = '0.0.1';
        this._siteName = 'site';
        this._home = '/';
        this._siteName = siteName;
        if (Site._instance) {
            throw new Error('Error: Only one site is allowed.');
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
            var body = '';
            msg.on('data', function (data) {
                body += data;
            });
            msg.on('end', function () {
                var bodyData = querystring.parse(body);
                var promise;
                switch (msg.method) {
                    case 'DELETE':
                        promise = site.delete(route);
                        break;
                    case 'GET':
                        promise = site.get(route);
                        break;
                    case 'POST':
                        promise = site.post(route, bodyData);
                        break;
                }
                if (promise) {
                    console.log('>>>>> Check the promise');
                    promise.then(function (rep) {
                        console.log('>>>>> RESOLVED ');
                        rep.serve(response);
                    }).fail(function (error) {
                        console.log('>>>>> FAIL');
                        console.log(error);
                        var rxErr = error;
                        if (error.getHttpCode) {
                            console.log(rxErr.toString());
                            response.writeHead(rxErr.getHttpCode(), { "Content-Type": "text/html" });
                            response.write('<h1>relax.js: error</h1>');
                        }
                        else {
                            console.log(rxErr);
                            response.writeHead(500, { "Content-Type": "text/html" });
                            response.write('<h1>Error</h1>');
                        }
                        response.write('<h2>' + error.name + '</h2>');
                        response.write('<h3 style="color:red;">' + _.escape(error.message) + '</h3><hr/>');
                        response.write('<pre>' + error.stack + '</pre>');
                        response.end();
                    }).done();
                }
            });
        });
    };
    Site.prototype.setHome = function (path) {
        this._home = path;
    };
    Site.prototype.head = function (route) {
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    Site.prototype.get = function (route) {
        var self = this;
        var ctx = '[' + this.name() + '.get] ';
        console.log(ctx + ' route:' + route.path);
        if (route.static) {
            return internals.viewStatic(route.pathname);
        }
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
        if (self._home === '/') {
            return internals.viewDynamic(self.name(), this);
        }
        else {
            return internals.redirect(self._home);
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
    Site.prototype.put = function (route, body) {
        var self = this;
        var ctx = '[' + this.name() + '.put] ';
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    Site.prototype.delete = function (route) {
        var self = this;
        var ctx = '[' + this.name() + '.delete] ';
        if (route.static) {
            return internals.promiseError('DELETE not supported on static resources', route.pathname);
        }
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                console.log(_.str.sprintf('%s "%s"', ctx, direction.resource.name()));
                return direction.resource.delete(direction.route);
            }
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid in request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    Site.prototype.patch = function (route, body) {
        var self = this;
        var ctx = '[' + this.name() + '.patch] ';
        if (route.static) {
            return internals.promiseError('DELETE not supported on static resources', route.pathname);
        }
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    Site._instance = null;
    return Site;
})(Container);
exports.Site = Site;
var ResourcePlayer = (function (_super) {
    __extends(ResourcePlayer, _super);
    function ResourcePlayer(res, parent) {
        _super.call(this, parent);
        this._name = '';
        this._template = '';
        var self = this;
        self._name = res.name;
        self._template = res.view;
        self._layout = res.layout;
        self._onGet = res.onGet ? Q.nbind(res.onGet, this) : undefined;
        self._onPost = res.onPost ? Q.nbind(res.onPost, this) : undefined;
        self._onDelete = res.onPost ? Q.nbind(res.onDelete, this) : undefined;
        if (res.resources) {
            _.each(res.resources, function (child, index) {
                self.add(child);
            });
        }
        _.each(res.data, function (value, attrname) {
            if (attrname != 'resources') {
                self[attrname] = value;
            }
        });
    }
    ResourcePlayer.prototype.name = function () {
        return this._name;
    };
    ResourcePlayer.prototype.head = function (route) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.head]', self._name));
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    ResourcePlayer.prototype.get = function (route) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.get]', self._name));
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource)
                return direction.resource.get(direction.route);
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        var dyndata = {};
        if (self._onGet) {
            var later = Q.defer();
            console.log(_.str.sprintf('%s Calling onGet()!', ctx));
            this._onGet(route.query).then(function (response) {
                var dyndata = response.data;
                _.each(dyndata, function (value, attrname) {
                    self[attrname] = value;
                });
                if (self._template) {
                    console.log(_.str.sprintf('%s View "%s" as HTML using %s', ctx, self._name, self._template));
                    internals.viewDynamic(self._template, self, self._layout).then(function (emb) {
                        later.resolve(emb);
                    }).fail(function (err) {
                        later.reject(err);
                    });
                }
                else {
                    console.log(_.str.sprintf('%s View "%s" as JSON.', ctx, self._name));
                    internals.viewJson(self).then(function (emb) {
                        later.resolve(emb);
                    }).fail(function (err) {
                        later.reject(err);
                    });
                }
            }).fail(function (rxErr) {
                later.reject(rxErr);
            });
            return later.promise;
        }
        console.log(_.str.sprintf('%s getting resource from the data ', ctx));
        if (this._template) {
            return internals.viewDynamic(self._template, self, self._layout);
        }
        else {
            return internals.viewJson(self);
        }
    };
    ResourcePlayer.prototype.delete = function (route) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.delete]', self._name));
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource)
                return direction.resource.delete(direction.route);
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        if (self._onDelete) {
            var later = Q.defer();
            console.log(_.str.sprintf('%s Calling onDelete()', ctx));
            this._onDelete(route.query).then(function (response) {
                var dyndata = response.data;
                _.each(dyndata, function (value, attrname) {
                    self[attrname] = value;
                });
                internals.viewJson(self).then(function (emb) {
                    emb.httpCode = response.httpCode ? response.httpCode : 200;
                    emb.location = response.location ? response.location : '';
                    later.resolve(emb);
                }).fail(function (err) {
                    later.reject(err);
                });
            }).fail(function (rxErr) {
                later.reject(rxErr);
            });
            return later.promise;
        }
        console.log(_.str.sprintf('%s Removing static resource', ctx));
        self.parent.remove(self);
        return internals.viewJson(self);
    };
    ResourcePlayer.prototype.post = function (route, body) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.post]', self._name));
        if (route.path.length > 1) {
            var direction = self.getDirection(route);
            if (direction.resource)
                return direction.resource.post(direction.route, body);
            else {
                return internals.promiseError(_.str.sprintf('%s ERROR Resource not found or invalid request "%s"', ctx, route.pathname), route.pathname);
            }
        }
        else {
            var later = Q.defer();
            if (this._onPost) {
                self._onPost(route.query, body).then(function (response) {
                    var dyndata = response.data;
                    console.log(_.str.sprintf('%s View "%s" as JSON.', ctx, self._name));
                    _.each(_.keys(dyndata), function (key) {
                        self[key] = dyndata[key];
                    });
                    internals.viewJson(self).then(function (emb) {
                        emb.httpCode = response.httpCode ? response.httpCode : 200;
                        emb.location = response.location ? response.location : '';
                        console.log(_.str.sprintf('%s Embodiment Ready to Resolve %s', ctx, emb.dataAsString()));
                        later.resolve(emb);
                    }).fail(function (err) {
                        later.reject(err);
                    });
                });
            }
            else {
                _.each(_.keys(body), function (key) {
                    self[key] = body[key];
                });
                internals.viewJson(self).then(function (emb) {
                    later.resolve(emb);
                }).fail(function (err) {
                    later.reject(err);
                });
            }
            return later.promise;
        }
    };
    ResourcePlayer.prototype.put = function (route, body) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.put]', self._name));
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    ResourcePlayer.prototype.patch = function (route, body) {
        var self = this;
        var ctx = _.str.sprintf(_.str.sprintf('[%s.patch]', self._name));
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    return ResourcePlayer;
})(Container);
exports.ResourcePlayer = ResourcePlayer;
function site(name) {
    return Site.$(name);
}
exports.site = site;
//# sourceMappingURL=relaxjs.js.map