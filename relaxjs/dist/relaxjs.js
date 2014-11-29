var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var http = require("http");
var Q = require('q');
var _ = require("lodash");
var xml2js = require('xml2js');
var internals = require('./internals');
var routing = require('./routing');
var rxError = require('./rxerror');
exports.routing = routing;
exports.rxError = rxError;
exports.version = "0.1.2";
function relax() {
    console.log('relax.js !');
}
exports.relax = relax;
var Embodiment = (function () {
    function Embodiment(mimeType, code, body) {
        if (code === void 0) { code = 200; }
        this.httpCode = code;
        this.body = body;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        var log = internals.log().child({ func: 'Embodiment.serve' });
        var headers = { 'content-type': this.mimeType };
        if (this.body)
            headers['content-length'] = this.body.length;
        if (this.location)
            headers['Location'] = this.location;
        response.writeHead(this.httpCode, headers);
        if (this.body) {
            response.write(this.body);
            if (this.body.length > 1024)
                log.info('Sending %s Kb (as %s)', Math.round(this.body.length / 1024), this.mimeType);
            else
                log.info('Sending %s bytes (as %s)', this.body.length, this.mimeType);
        }
        response.end();
    };
    Embodiment.prototype.bodyAsString = function () {
        return this.body.toString('utf-8');
    };
    Embodiment.prototype.bodyAsJason = function () {
        return JSON.parse(this.bodyAsString());
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
        var indexName = internals.slugify(newRes.name);
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
        if (this._resources[name] && this._resources[name].length > idx)
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
    Object.defineProperty(Site.prototype, "urlName", {
        get: function () {
            return internals.slugify(this.name);
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
    Site.prototype._outputError = function (response, error, format) {
        var mimeType = format.split(/[\s,]+/)[0];
        var errCode = error.getHttpCode ? error.getHttpCode() : 500;
        response.writeHead(errCode, { 'content-type': mimeType });
        var errObj = {
            version: exports.version,
            result: 'error',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack.split('\n')
            }
        };
        switch (mimeType) {
            case 'text/html':
                response.write('<h1>relax.js: We Got Errors</h1>');
                response.write('<h2>' + error.name + '</h2>');
                response.write('<h3 style="color:red;">' + _.escape(error.message) + '</h3><hr/>');
                response.write('<pre>' + _.escape(error.stack) + '</pre>');
                break;
            case 'application/xml':
            case 'text/xml':
                var builder = new xml2js.Builder({ rootName: 'relaxjs' });
                response.write(builder.buildObject(errObj));
                break;
            case 'application/json':
            default:
                response.write(JSON.stringify(errObj));
                break;
        }
        response.end();
    };
    Site.prototype.serve = function () {
        var _this = this;
        var self = this;
        return http.createServer(function (msg, response) {
            var route = routing.fromUrl(msg);
            var site = _this;
            var log = internals.log().child({ func: 'Site.serve' });
            log.info('   REQUEST: %s', route.verb);
            log.info('      PATH: %s %s', route.pathname, route.query);
            log.info('Out FORMAT: %s', route.outFormat);
            log.info(' In FORMAT: %s', route.inFormat);
            var body = '';
            msg.on('data', function (data) {
                body += data;
            });
            msg.on('end', function () {
                var promise;
                if (site[msg.method.toLowerCase()] === undefined) {
                    log.error('%s request is not supported ');
                    return;
                }
                internals.parseData(body, route.inFormat).then(function (bodyData) {
                    site[msg.method.toLowerCase()](route, bodyData).then(function (reply) {
                        log.info('HTTP %s request fulfilled', msg.method);
                        reply.serve(response);
                    }).fail(function (error) {
                        log.error('HTTP %s request failed: %s:', msg.method, error.message);
                        self._outputError(response, error, route.outFormat);
                    }).done();
                }).fail(function (error) {
                    log.error('HTTP %s request body could not be parsed: %s:', msg.method, error.message);
                    self._outputError(response, error, route.outFormat);
                });
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
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
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
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
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
        return internals.promiseError(internals.format('[error] Root Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.post = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.post' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'POST');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('POST on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.post(direction.route, body);
        }
        return internals.promiseError(internals.format('[error] Invalid in request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.patch = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'Site.patch' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PATCH');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PATCH on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.patch(direction.route, body);
        }
        return internals.promiseError(internals.format('[error] Invalid in request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.put = function (route, body) {
        var log = internals.log().child({ func: 'Site.put' });
        var self = this;
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PUT');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PUT on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.put(direction.route, body);
        }
        return internals.promiseError(internals.format('[error] Invalid PUT request "{0}"', route.pathname), route.pathname);
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
                return internals.promiseError(internals.format('{0} [error] Resource not found or invalid in request "{1}"', ctx, route.pathname), route.pathname);
            var res = (direction.resource);
            internals.log().info('%s "%s"', ctx, res.name);
            route.path = direction.route.path;
            return res.delete(direction.route);
        }
        return internals.promiseError(internals.format('[error] Invalid DELETE request "{0}"', route.pathname), route.pathname);
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
        self._outFormat = res.outFormat;
        self._onGet = res.onGet ? Q.nbind(res.onGet, this) : undefined;
        self._onPost = res.onPost ? Q.nbind(res.onPost, this) : undefined;
        self._onPatch = res.onPatch ? Q.nbind(res.onPatch, this) : undefined;
        self._onDelete = res.onDelete ? Q.nbind(res.onDelete, this) : undefined;
        self._onPut = res.onPut ? Q.nbind(res.onPut, this) : undefined;
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
    Object.defineProperty(ResourcePlayer.prototype, "urlName", {
        get: function () {
            return internals.slugify(this.name);
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
    ResourcePlayer.prototype.fail = function (response, err) {
        var self = this;
        var log = internals.log().child({ func: self._name + '.fail' });
        log.info('Call failed: %s', err.message);
        response(err, null);
    };
    ResourcePlayer.prototype._readParameters = function (path, generateError) {
        var _this = this;
        if (generateError === void 0) { generateError = true; }
        var log = internals.log().child({ func: this._name + '._readParameters' });
        var counter = 0;
        _.each(this._paramterNames, function (parameterName, idx, list) {
            if (!path[idx + 1]) {
                if (generateError) {
                    log.error('Could not read all the required paramters from URI. Read %d, needed %d', counter, _this._paramterNames.length);
                }
                return counter;
            }
            _this._parameters[parameterName] = path[idx + 1];
            counter++;
        });
        log.info('Read %d parameters from request URL: %s', counter, JSON.stringify(this._parameters));
        return counter;
    };
    ResourcePlayer.prototype._updateData = function (newData) {
        var self = this;
        self.data = {};
        _.each(newData, function (value, attrname) {
            if (attrname != 'resources') {
                self.data[attrname] = value;
            }
        });
    };
    ResourcePlayer.prototype._deliverReply = function (later, resResponse, outFormat) {
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ')._deliverReply' });
        var mimeTypes = outFormat ? outFormat.split(/[\s,;]+/) : ['application/json'];
        log.info('Formats: %s', JSON.stringify(mimeTypes));
        if (self._template && (mimeTypes.indexOf('text/html') != -1 || mimeTypes.indexOf('*/*') != -1)) {
            self.data = resResponse.data;
            internals.viewDynamic(self._template, self, self._layout).then(function (reply) {
                reply.httpCode = resResponse.httpCode ? resResponse.httpCode : 200;
                reply.location = resResponse.location;
                later.resolve(reply);
            }).fail(function (err) {
                later.reject(err);
            });
        }
        else {
            var mimeType = undefined;
            if (mimeTypes.indexOf('*/*') != -1) {
                mimeType = 'application/json';
            }
            if (mimeTypes.indexOf('application/json') != -1) {
                mimeType = 'application/json';
            }
            if (mimeTypes.indexOf('application/xml') != -1) {
                mimeType = 'application/xml';
            }
            if (mimeTypes.indexOf('text/xml') != -1) {
                mimeType = 'text/xml';
            }
            if (mimeTypes.indexOf('application/xhtml+xml') != -1) {
                mimeType = 'application/xml';
            }
            if (mimeTypes.indexOf('application/x-www-form-urlencoded') != -1) {
                mimeType = 'text/xml';
            }
            if (mimeType) {
                internals.createEmbodiment(resResponse.data, mimeType).then(function (reply) {
                    reply.httpCode = resResponse.httpCode ? resResponse.httpCode : 200;
                    reply.location = resResponse.location;
                    later.resolve(reply);
                }).fail(function (err) {
                    later.reject(err);
                });
            }
            else {
                later.reject(new rxError.RxError('output as (' + outFormat + ') is not available for this resource', 'Unsupported Media Type', 415));
            }
        }
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
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ').get' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                log.info('GET on resource "%s"', res.name);
                return res.get(direction.route);
            }
            else {
                if (_.keys(self._resources).length === 0)
                    return internals.promiseError(internals.format('[error: no child] This resource "{0}" does not have any child resource to navigate to. Path= "{1}"', self.name, JSON.stringify(route.path)), route.pathname);
                else
                    return internals.promiseError(internals.format('[error: no such child] ResourcePlayer GET could not find a Resource for "{0}"', JSON.stringify(route.path)), route.pathname);
            }
        }
        log.info('GET Target Found : %s (requires %d parameters)', self._name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new rxError.RxError('Not enough paramters available in the URI ', 'GET ' + self.name, 404));
                return later.promise;
            }
        }
        site().setPathCache(route.pathname, { resource: this, path: route.path });
        var dyndata = {};
        if (self._onGet) {
            log.info('Invoking onGet()! on %s (%s)', self._name, route.outFormat);
            self._onGet(route.query).then(function (response) {
                self._updateData(response.data);
                self._deliverReply(later, response, self._outFormat ? self._outFormat : route.outFormat);
            }).fail(function (rxErr) {
                later.reject(rxErr);
            }).catch(function (error) {
                later.reject(error);
            });
            return later.promise;
        }
        log.info('Returning static data from %s', self._name);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, self._outFormat ? self._outFormat : route.outFormat);
        return later.promise;
    };
    ResourcePlayer.prototype.delete = function (route) {
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ').delete' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('DELETE on resource "%s"', res.name);
                return res.delete(direction.route);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        log.info('DELETE Target Found : %s (requires %d parameters)', self._name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new rxError.RxError('Not enough paramters available in the URI ', 'DELETE ' + self.name, 404));
                return later.promise;
            }
        }
        if (self._onDelete) {
            log.info('call onDelete() for %s', self._name);
            this._onDelete(route.query).then(function (response) {
                self._updateData(response.data);
                self._deliverReply(later, response, route.outFormat);
            }).fail(function (rxErr) {
                later.reject(rxErr);
            });
            return later.promise;
        }
        log.info('Default Delete: Removing resource %s', self._name);
        self.parent.remove(self);
        self.parent = null;
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, route.outFormat);
        return later.promise;
    };
    ResourcePlayer.prototype.post = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ').post' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('POST on resource "%s"', res.name);
                return res.post(direction.route, body);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        log.info('POST Target Found : %s (requires %d parameters)', self._name, paramCount);
        if (paramCount > 0) {
            self._readParameters(route.path, false);
        }
        if (self._onPost) {
            log.info('calling onPost() for %s', self._name);
            self._onPost(route.query, body).then(function (response) {
                self._deliverReply(later, response, route.outFormat);
            }).fail(function (rxErr) {
                later.reject(rxErr);
            });
            return later.promise;
        }
        log.info('Adding data for %s', self._name);
        self._updateData(body);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, route.outFormat);
        return later.promise;
    };
    ResourcePlayer.prototype.patch = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ').patch' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('PATCH on resource "%s"', res.name);
                return res.patch(direction.route, body);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        log.info('PATCH Target Found : %s (requires %d parameters)', self._name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new rxError.RxError('Not enough paramters available in the URI ', 'PATCH ' + self.name, 404));
                return later.promise;
            }
        }
        if (self._onPatch) {
            log.info('calling onPatch() for %s', self._name);
            self._onPatch(route.query, body).then(function (response) {
                self._updateData(response.data);
                self._deliverReply(later, response, route.outFormat);
            }).fail(function (rxErr) {
                later.reject(rxErr);
            });
            return later.promise;
        }
        log.info('Updating data for %s', self._name);
        self._updateData(body);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, route.outFormat);
        return later.promise;
    };
    ResourcePlayer.prototype.put = function (route, body) {
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self._name + ').put' });
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