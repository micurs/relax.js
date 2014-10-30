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
        return true;
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
            direction.resource = this.getChild(childResName, idx);
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
        internals.initLog(siteName);
        if (_.find(process.argv, function (arg) { return arg === '--relaxjs-verbose'; })) {
            internals.setLogVerbose(true);
        }
    }
    Site.$ = function (name) {
        if (Site._instance === null) {
            Site._instance = new Site(name ? name : 'site');
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
                    console.log(error);
                    var rxErr = error;
                    console.log(rxErr.toString());
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
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    Site.prototype.get = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.get' });
        log.info('route: %s', route.pathname);
        if (route.static) {
            return internals.viewStatic(route.pathname);
        }
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                log.info('GET on resource "%s"', direction.resource.name());
                return direction.resource.get(direction.route);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            }
        }
        if (self._home === '/') {
            return internals.viewDynamic(self.name(), this);
        }
        else {
            log.info('GET is redirecting to "%s"', self._home);
            return internals.redirect(self._home);
        }
    };
    Site.prototype.post = function (route, body) {
        var log = internals.log().child({ func: 'Site.post' });
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                log.info('POST on resource "%s"', direction.resource.name());
                return direction.resource.post(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            }
        }
        return internals.promiseError(_.str.sprintf('ERROR Invalid in request "%s"', route.pathname), route.pathname);
    };
    Site.prototype.patch = function (route, body) {
        var log = internals.log().child({ func: 'Site.patch' });
        var self = this;
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                log.info('PATCH on resource "%s"', direction.resource.name());
                return direction.resource.patch(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found or invalid in request "%s"', route.pathname), route.pathname);
            }
        }
        return internals.promiseError(_.str.sprintf('ERROR Invalid in request "%s"', route.pathname), route.pathname);
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
    Site.prototype.delete = function (route, body) {
        var self = this;
        var ctx = '[' + this.name() + '.delete] ';
        if (route.static) {
            return internals.promiseError('DELETE not supported on static resources', route.pathname);
        }
        if (route.path.length > 1) {
            var direction = this.getDirection(route);
            if (direction.resource) {
                internals.log().info('%s "%s"', ctx, direction.resource.name());
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
    ResourcePlayer.prototype.name = function () {
        return this._name;
    };
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
        var counter = 0;
        _.each(this._paramterNames, function (parameterName, idx, list) {
            _this._parameters[parameterName] = path[idx + 1];
            counter++;
        });
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
        var ctx = _.str.sprintf(_.str.sprintf('[%s.head]', self._name));
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    ResourcePlayer.prototype.get = function (route) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.get' });
        var paramCount = self._paramterNames.length;
        if (route.path.length > (1 + paramCount)) {
            var direction = self.getDirection(route);
            if (direction.resource) {
                log.info('GET on resource "%s"', direction.resource.name());
                return direction.resource.get(direction.route);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        var dyndata = {};
        if (self._onGet) {
            var later = Q.defer();
            log.info('Invoking onGet()!');
            this._onGet(route.query).then(function (response) {
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
            var direction = this.getDirection(route);
            if (direction.resource) {
                log.info('DELETE on resource "%s"', direction.resource.name());
                return direction.resource.delete(direction.route);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (self._onDelete) {
            log.info('calling onDelete() for %s', self._name);
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
        log.info('Removing static resource %s', self._name);
        self.parent.remove(self);
        return internals.viewJson(self);
    };
    ResourcePlayer.prototype.post = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.post' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self.getDirection(route);
            if (direction.resource) {
                log.info('POST on resource "%s"', direction.resource.name());
                return direction.resource.post(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (this._onPost) {
            log.info('calling onPost() for %s', self._name);
            self._onPost(route.query, body).then(function (response) {
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
        if (route.path.length > 1) {
            var direction = self.getDirection(route);
            if (direction.resource) {
                log.info('PATCH on resource "%s"', direction.resource.name());
                return direction.resource.patch(direction.route, body);
            }
            else {
                return internals.promiseError(_.str.sprintf('ERROR Resource not found "%s"', route.pathname), route.pathname);
            }
        }
        if (paramCount > 0)
            self._readParameters(route.path);
        if (this._onPatch) {
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