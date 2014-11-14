var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require("http");
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var internals = require('./internals');
var routing = require('./routing');
var rxError = require('./rxerror');
exports.routing = routing;
exports.version = "0.1.0";
function relax() {
    console.log('relax.js !');
}
exports.relax = relax;
var Embodiment = (function () {
    function Embodiment(mimeType, data) {
        this.httpCode = 200;
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        var headers = { 'content-type': this.mimeType };
        if (this.data)
            headers['content-length'] = this.data.length;
        if (this.location)
            headers['Location'] = this.location;
        response.writeHead(this.httpCode, headers);
        if (this.data)
            response.write(this.data);
        response.end();
        if (this.data.length > 1024)
            internals.log().info({ func: 'serve', class: 'Embodiment' }, 'Sending %s Kb', _.str.numberFormat(this.data.length / 1024, 1));
        else
            internals.log().info({ func: 'serve', class: 'Embodiment' }, 'Sending %s bytes', _.str.numberFormat(this.data.length));
    };
    Embodiment.prototype.dataAsString = function () {
        return this.data.toString('utf-8');
    };
    Embodiment.prototype.dataAsJason = function () {
        return JSON.parse(this.dataAsString());
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
        var log = internals.log().child({ func: 'Container.remove' });
        var resArr = this._resources[child.name];
        if (!resArr)
            return false;
        var idx = _.indexOf(resArr, child);
        if (idx < 0)
            return false;
        resArr.splice(idx, 1);
        log.info('- %s', child.name);
        return true;
    };
    Container.prototype._getStepDirection = function (route) {
        var log = internals.log().child({ func: 'Container.getStepDirection' });
        var direction = new routing.Direction();
        log.info('Get the next step on %s', JSON.stringify(route.path));
        direction.route = route.stepThrough(1);
        var childResName = direction.route.getNextStep();
        if (childResName in this._resources) {
            var idx = 0;
            if (this._resources[childResName].length > 1) {
                if (direction.route.path[1] !== undefined) {
                    idx = parseInt(direction.route.path[1]);
                    if (isNaN(idx)) {
                        idx = 0;
                    }
                    else {
                        direction.route = direction.route.stepThrough(1);
                    }
                }
            }
            log.info('Access Resource "%s"[%d] ', childResName, idx);
            direction.resource = this.getChild(childResName, idx);
        }
        if (!direction.resource)
            return undefined;
        return direction;
    };
    Container.prototype._getDirection = function (route, verb) {
        if (verb === void 0) { verb = 'GET'; }
        var log = internals.log().child({ func: 'Container._getDirection' });
        log.info('%s Step into %s ', verb, route.pathname);
        var direction = this._getStepDirection(route);
        if (direction && direction.resource) {
            direction.verb = verb;
            return direction;
        }
        log.info('No Direction found', verb, route.pathname);
        return undefined;
    };
    Container.prototype.getResource = function (pathname) {
        var route = new routing.Route(pathname);
        var direction = this._getDirection(route);
        if (!direction)
            return undefined;
        var resource = direction.resource;
        route.path = direction.route.path;
        while (route.path.length > 1) {
            direction = resource._getStepDirection(route);
            if (direction) {
                resource = direction.resource;
                route.path = direction.route.path;
            }
            else {
                return undefined;
            }
        }
        return resource;
    };
    Container.prototype.add = function (newRes) {
        var log = internals.log().child({ func: 'Container.add' });
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
        log.info('+ %s', indexName);
    };
    Container.prototype.getFirstMatching = function (typeName) {
        var childArray = this._resources[typeName];
        if (childArray === undefined) {
            return null;
        }
        return childArray[0];
    };
    Container.prototype.getChild = function (name, idx) {
        if (idx === void 0) { idx = 0; }
        if (this._resources[name])
            return this._resources[name][idx];
        else
            return undefined;
    };
    Container.prototype.childTypeCount = function (typeName) {
        if (this._resources[typeName])
            return this._resources[typeName].length;
        else
            return 0;
    };
    Container.prototype.childrenCount = function () {
        var counter = 0;
        _.each(this._resources, function (arrayItem) {
            counter += arrayItem.length;
        });
        return counter;
    };
    return Container;
})();
exports.Container = Container;
var Site = (function (_super) {
    __extends(Site, _super);
    function Site(siteName, parent) {
        _super.call(this, parent);
        this._name = "site";
        this._version = exports.version;
        this._siteName = 'site';
        this._home = '/';
        this._pathCache = {};
        this._siteName = siteName;
        if (Site._instance) {
            throw new Error('Error: Only one site is allowed.');
        }
        Site._instance = this;
        internals.initLog(siteName);
        if (_.find(process.argv, function (arg) { return arg === '--relaxjs-verbose'; })) {
            internals.setLogVerbose(true);
        }
    }
    Site.$ = function (name) {
        if (Site._instance === null || name) {
            Site._instance = null;
            Site._instance = new Site(name ? name : 'site');
        }
        return Site._instance;
    };
    Site.prototype._getDirection = function (route, verb) {
        if (verb === void 0) { verb = 'GET'; }
        var log = internals.log().child({ func: 'Site._getDirection' });
        var cachedPath = this._pathCache[route.pathname];
        if (cachedPath) {
            var direction = new routing.Direction();
            direction.resource = cachedPath.resource;
            direction.route = route;
            direction.route.path = cachedPath.path;
            direction.verb = verb;
            log.info('%s Path Cache found for "%s"', verb, route.pathname);
            return direction;
        }
        else {
            log.info('%s Step into %s ', verb, route.pathname);
            var direction = this._getStepDirection(route);
            if (direction && direction.resource) {
                direction.verb = verb;
                return direction;
            }
        }
        log.info('No Direction found', verb, route.pathname);
        return undefined;
    };
    Object.defineProperty(Site.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
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
    Site.prototype.setPathCache = function (path, shortcut) {
        this._pathCache[path] = shortcut;
    };
    Site.prototype.serve = function () {
        var _this = this;
        return http.createServer(function (msg, response) {
            var route = routing.fromUrl(msg);
            var site = _this;
            var log = internals.log().child({ func: 'Site.serve' });
            log.info('NEW REQUEST %s', msg.method);
            var body = '';
            msg.on('data', function (data) {
                body += data;
            });
            msg.on('end', function () {
                var promise;
                var bodyData = {};
                if (body.length > 0)
                    bodyData = internals.parseData(body, msg.headers['content-type']);
                if (site[msg.method.toLowerCase()] === undefined) {
                    log.error('%s request is not supported ');
                    return;
                }
                site[msg.method.toLowerCase()](route, bodyData).then(function (rep) {
                    rep.serve(response);
                }).fail(function (error) {
                    var rxErr = error;
                    if (error.getHttpCode) {
                        response.writeHead(rxErr.getHttpCode(), { "content-type": "text/html" });
                        response.write('<h1>relax.js: we got an error</h1>');
                    }
                    else {
                        response.writeHead(500, { "content-type": "text/html" });
                        response.write('<h1>Error</h1>');
                    }
                    response.write('<h2>' + error.name + '</h2>');
                    response.write('<h3 style="color:red;">' + _.escape(error.message) + '</h3><hr/>');
                    response.write('<pre>' + error.stack + '</pre>');
                    response.end();
                }).done();
            });
        });
    };
    Site.prototype.setHome = function (path) {
        this._home = path;
    };
    Site.prototype.head = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.head' });
        log.info('route: %s', route.pathname);
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'HEAD');
            if (!direction) {
                return internals.promiseError(_.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            }
            route.path = direction.route.path;
            var res = (direction.resource);
            return res.head(route);
        }
        if (self._home === '/') {
            return internals.viewDynamic(self.name, this);
        }
        else {
            log.info('HEAD is redirecting to "%s"', self._home);
            return internals.redirect(self._home);
        }
    };
    Site.prototype.get = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.get' });
        log.info('route: %s', route.pathname);
        if (route.static) {
            return internals.viewStatic(route.pathname);
        }
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'GET');
            if (direction === undefined) {
                return internals.promiseError(_.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            }
            route.path = direction.route.path;
            var res = (direction.resource);
            return res.get(route);
        }
        if (route.path[0] === 'site' && self._home === '/') {
            return internals.viewDynamic(self.name, this);
        }
        if (self._home !== '/') {
            log.info('GET is redirecting to "%s"', self._home);
            return internals.redirect(self._home);
        }
        return internals.promiseError(_.str.sprintf('[error] Root Resource not found or invalid in request "%s"', route.pathname), route.pathname);
    };
    Site.prototype.post = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.post' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'POST');
            if (!direction)
                return internals.promiseError(_.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('POST on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.post(direction.route, body);
        }
        return internals.promiseError(_.str.sprintf('[error] Invalid in request "%s"', route.pathname), route.pathname);
    };
    Site.prototype.patch = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.patch' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PATCH');
            if (!direction)
                return internals.promiseError(_.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PATCH on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.patch(direction.route, body);
        }
        return internals.promiseError(_.str.sprintf('[error] Invalid in request "%s"', route.pathname), route.pathname);
    };
    Site.prototype.put = function (route, body) {
        var log = internals.log().child({ func: 'Site.put' });
        var self = this;
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PUT');
            if (!direction)
                return internals.promiseError(_.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PATCH on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.put(direction.route, body);
        }
        return internals.promiseError(_.str.sprintf('[error] Invalid PUT request "%s"', route.pathname), route.pathname);
    };
    Site.prototype.delete = function (route, body) {
        var self = this;
        var ctx = '[' + this.name + '.delete] ';
        if (route.static) {
            return internals.promiseError('DELETE not supported on static resources', route.pathname);
        }
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'DELETE');
            if (!direction)
                return internals.promiseError(_.str.sprintf('%s [error] Resource not found or invalid in request "%s"', ctx, route.pathname), route.pathname);
            var res = (direction.resource);
            internals.log().info('%s "%s"', ctx, res.name);
            route.path = direction.route.path;
            return res.delete(direction.route);
        }
        return internals.promiseError(_.str.sprintf('[error] Invalid DELETE request "%s"', route.pathname), route.pathname);
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
        this._parameters = {};
        this.data = {};
        var self = this;
        self._name = res.name;
        self._template = res.view;
        self._layout = res.layout;
        self._paramterNames = res.urlParameters ? res.urlParameters : [];
        self._parameters = {};
        self._onGet = res.onGet ? Q.nbind(res.onGet, this) : undefined;
        self._onPost = res.onPost ? Q.nbind(res.onPost, this) : undefined;
        self._onPatch = res.onPatch ? Q.nbind(res.onPatch, this) : undefined;
        self._onDelete = res.onDelete ? Q.nbind(res.onDelete, this) : undefined;
        if (res.resources) {
            _.each(res.resources, function (child, index) {
                self.add(child);
            });
        }
        self._updateData(res.data);
    }
    Object.defineProperty(ResourcePlayer.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    ResourcePlayer.prototype.ok = function (response, data) {
        var respObj = { result: 'ok' };
        if (data)
            respObj['data'] = data;
        response(null, respObj);
    };
    ResourcePlayer.prototype.redirect = function (response, where, data) {
        var respObj = { result: 'ok', httpCode: 303, location: where };
        if (data)
            respObj['data'] = data;
        response(null, respObj);
    };
    ResourcePlayer.prototype.fail = function (response, data) {
        var respObj = { result: 'fail' };
        if (data)
            respObj['data'] = data;
        response(null, respObj);
    };
    ResourcePlayer.prototype._readParameters = function (path) {
        var _this = this;
        var log = internals.log().child({ func: this._name + '._readParameters' });
        var counter = 0;
        _.each(this._paramterNames, function (parameterName, idx, list) {
            _this._parameters[parameterName] = path[idx + 1];
            counter++;
        });
        log.info(this._parameters);
        return counter;
    };
    ResourcePlayer.prototype._updateData = function (newData) {
        var _this = this;
        this.data = {};
        _.each(newData, function (value, attrname) {
            if (attrname != 'resources') {
                _this.data[attrname] = value;
            }
        });
    };
    ResourcePlayer.prototype.head = function (route) {
        var self = this;
        var later = Q.defer();
        _.defer(function () {
            later.reject(new rxError.RxError('Not Implemented'));
        });
        return later.promise;
    };
    ResourcePlayer.prototype.get = function (route) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.get' });
        var paramCount = self._paramterNames.length;
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                log.info('GET on resource "%s"', res.name);
                return res.get(direction.route);
            }
            else {
                if (_.keys(self._resources).length === 0)
                    return internals.promiseError(_.str.sprintf('[error: no child] This resource "%s" does not have any child resource to navigate to. Path= "%s"', self.name, JSON.stringify(route.path)), route.pathname);
                else
                    return internals.promiseError(_.str.sprintf('[error: no such child] ResourcePlayer GET could not find a Resource for "%s"', JSON.stringify(route.path)), route.pathname);
            }
        }
        log.info('GET Target Found : %s', self._name);
        if (paramCount > 0)
            self._readParameters(route.path);
        site().setPathCache(route.pathname, { resource: this, path: route.path });
        var dyndata = {};
        if (self._onGet) {
            var later = Q.defer();
            log.info('Invoking onGet()! on %s', self._name);
            self._onGet(route.query).then(function (response) {
                self._updateData(response.data);
                if (self._template) {
                    internals.viewDynamic(self._template, self, self._layout).then(function (emb) {
                        later.resolve(emb);
                    }).fail(function (err) {
                        later.reject(err);
                    });
                }
                else {
                    internals.viewJson(self.data).then(function (emb) {
                        later.resolve(emb);
                    }).fail(function (err) {
                        later.reject(err);
                    });
                }
            }).fail(function (rxErr) {
                later.reject(rxErr);
            }).catch(function (error) {
                later.reject(error);
            });
            return later.promise;
        }
        log.info('Returning static data from %s', self._name);
        if (this._template) {
            return internals.viewDynamic(self._template, self, self._layout);
        }
        else {
            return internals.viewJson(self.data);
        }
    };
    ResourcePlayer.prototype.delete = function (route) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.delete' });
        var paramCount = self._paramterNames.length;
        if (route.path.length > (1 + paramCount)) {
            var direction = this._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                log.info('DELETE on resource "%s"', res.name);
                return res.delete(direction.route);
            }
            else {
                return internals.promiseError(_.str.sprintf('[error] Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (self._onDelete) {
            log.info('call onDelete() for %s', self._name);
            var later = Q.defer();
            this._onDelete(route.query).then(function (response) {
                self._updateData(response.data);
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
        log.info('Default Delete: Removing resource %s', self._name);
        self.parent.remove(self);
        self.parent = null;
        return internals.viewJson(self);
    };
    ResourcePlayer.prototype.post = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.post' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                log.info('POST on resource "%s"', res.name);
                return res.post(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('[error] Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (self._onPost) {
            log.info('calling onPost() for %s', self._name);
            self._onPost(route.query, body).then(function (response) {
                internals.viewJson(response.data).then(function (emb) {
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
        log.info('Adding data for %s', self._name);
        self._updateData(body);
        internals.viewJson(self.data).then(function (emb) {
            later.resolve(emb);
        }).fail(function (err) {
            later.reject(err);
        });
        return later.promise;
    };
    ResourcePlayer.prototype.patch = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.patch' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                log.info('PATCH on resource "%s"', res.name);
                return res.patch(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('[error] Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (self._onPatch) {
            log.info('calling onPatch() for %s', self._name);
            self._onPatch(route.query, body).then(function (response) {
                self._updateData(response.data);
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
        log.info('Updating data for %s', self._name);
        self._updateData(body);
        internals.viewJson(self.data).then(function (emb) {
            later.resolve(emb);
        }).fail(function (err) {
            later.reject(err);
        });
        return later.promise;
    };
    ResourcePlayer.prototype.put = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.patch' });
        var later = Q.defer();
        _.defer(function () {
            later.reject(new rxError.RxError('Not Implemented'));
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