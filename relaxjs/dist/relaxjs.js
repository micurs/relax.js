/*
 * Relax.js version 0.1.4
 * by Michele Ursino March - 2015
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/lodash/lodash.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='../typings/xml2js/xml2js.d.ts' />
var http = require("http");
var Q = require('q');
var _ = require("lodash");
var xml2js = require('xml2js');
var internals = require('./internals');
var routing = require('./routing');
var rxError = require('./rxerror');
var package = require(__dirname + '/../package.json');
exports.routing = routing;
exports.rxError = rxError;
exports.version = package.version;
function relax() {
    console.log('relaxjs !');
}
exports.relax = relax;
/*
 * Extended Error class for Relax.js
*/
var RxError = (function () {
    function RxError(message, name, code, extra) {
        var tmp = new Error();
        this.message = message;
        this.name = name;
        this.httpCode = code ? code : 500;
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
        return internals.format('RxError {0}: {1}\n{2}\nStack:\n{3}', this.httpCode, this.name, this.message, this.stack);
    };
    return RxError;
})();
exports.RxError = RxError;
/*
 * Type definition for the response callback function to use on the HTTP verb function
*/
/*
export interface DataCallback {
  ( err: Error, resp?: ResourceResponse ): void;
}
*/
/*
 * A container of resources. This class offer helper functions to add and retrieve resources
 * child resources
 * -----------------------------------------------------------------------------------------------------------------------------
*/
var Container = (function () {
    function Container(parent) {
        this._name = '';
        this._cookiesData = []; // Outgoing cookies to be set
        this._cookies = []; // Received cookies unparsed
        this._resources = {};
        this.data = {};
        this._parent = parent;
    }
    Object.defineProperty(Container.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "urlName", {
        get: function () {
            return internals.slugify(this.name);
        },
        enumerable: true,
        configurable: true
    });
    Container.prototype.setName = function (newName) {
        this._name = newName;
    };
    Container.prototype.setCookie = function (cookie) {
        this._cookiesData.push(cookie);
    };
    Container.prototype.getCookies = function () {
        return this._cookies;
    };
    Object.defineProperty(Container.prototype, "cookiesData", {
        get: function () {
            return this._cookiesData;
        },
        enumerable: true,
        configurable: true
    });
    /*
     * Remove a child resource from this container
    */
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
    /*
     * Inspect the cuurent path in the given route and create the direction
     * to pass a http request to a child resource.
     * If the route.path is terminal this function finds the immediate target resource
     * and assign it to the direction.resource.
     * This function manages also the interpretaiton of an index in the path immediately
     * after the resource name.
    */
    Container.prototype._getStepDirection = function (route) {
        var log = internals.log().child({ func: 'Container.getStepDirection' });
        var direction = new Direction();
        log.info('Follow next step on %s', JSON.stringify(route.path));
        direction.route = route.stepThrough(1);
        var childResName = direction.route.getNextStep();
        if (childResName in this._resources) {
            var idx = 0;
            if (this._resources[childResName].length > 1) {
                // Since there are more than just ONE resource maching the name
                // we check the next element in the path for the index needed to
                // locate the right resource in the array.
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
    /*
     * Returns the direction toward the resource in the given route.
     * The Direction object returned may point directly to the resource requested or
     * may point to a resource that will lead to the requested resource
    */
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
    /*
     * Return the resource matching the given path.
    */
    Container.prototype.getResource = function (pathname) {
        var route = new routing.Route(pathname);
        var direction = this._getDirection(route); // This one may return the resource directly if cached
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
    // Add a resource of the given type as child
    Container.prototype.add = function (newRes) {
        var log = internals.log().child({ func: 'Container.add' });
        newRes['_version'] = site().version;
        newRes['siteName'] = site().siteName;
        var resourcePlayer = new ResourcePlayer(newRes, this);
        // Add the resource player to the child resource container for this container.
        var indexName = internals.slugify(newRes.name);
        var childArray = this._resources[indexName];
        if (childArray === undefined)
            this._resources[indexName] = [resourcePlayer];
        else {
            childArray.push(resourcePlayer);
        }
        log.info('+ %s', indexName);
    };
    // Find the first resource of the given type
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
    /*
     * Return the number of children resources of the given type.
    */
    Container.prototype.childTypeCount = function (typeName) {
        if (this._resources[typeName])
            return this._resources[typeName].length;
        else
            return 0;
    };
    /*
     * Return the total number of children resources for this node.
    */
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
/*
 * Helper class used to deliver a response from a HTTP verb function call.
 * An instance of this class is passed as argument to all verb functions
 * -----------------------------------------------------------------------------------------------------------------------------
*/
var Response = (function () {
    function Response(resource) {
        this._resource = resource;
    }
    Response.prototype.onOk = function (cb) {
        this._onOk = cb;
    };
    Response.prototype.onFail = function (cb) {
        this._onFail = cb;
    };
    // Helper function to call the response callback with a succesful code 'ok'
    Response.prototype.ok = function () {
        var respObj = { result: 'ok', httpCode: 200, cookiesData: this._resource.cookiesData };
        respObj['data'] = this._resource.data;
        if (this._onOk)
            this._onOk(respObj);
    };
    // Helper function to call the response callback with a redirect code 303
    Response.prototype.redirect = function (where) {
        var respObj = { result: 'ok', httpCode: 303, location: where, cookiesData: this._resource.cookiesData };
        respObj['data'] = this._resource.data;
        if (this._onOk)
            this._onOk(respObj);
    };
    // Helper function to call the response callback with a fail error
    Response.prototype.fail = function (err) {
        var log = internals.log().child({ func: this._resource.name + '.fail' });
        log.info('Call failed: %s', err.message);
        if (this._onFail)
            this._onFail(err);
    };
    return Response;
})();
exports.Response = Response;
var Direction = (function () {
    function Direction() {
    }
    return Direction;
})();
exports.Direction = Direction;
/*
 * Every resource is converted to their embodiment before is sent back as a HTTP Response
 * -----------------------------------------------------------------------------------------------------------------------------
*/
var Embodiment = (function () {
    function Embodiment(mimeType, code, body) {
        if (code === void 0) { code = 200; }
        this.cookiesData = []; // example a cookie valie would be ["type=ninja", "language=javascript"]
        this.httpCode = code;
        this.body = body;
        this.mimeType = mimeType;
    }
    // Add a serialized cookie to be returned as a set  cookie in a response.
    Embodiment.prototype.addSetCookie = function (cookie) {
        this.cookiesData.push(cookie);
    };
    Embodiment.prototype.serve = function (response) {
        var log = internals.log().child({ func: 'Embodiment.serve' });
        var headers = { 'content-type': this.mimeType };
        if (this.body)
            headers['content-length'] = this.body.length;
        if (this.location)
            headers['Location'] = this.location;
        // Add the cookies set to the header
        _.each(this.cookiesData, function (cookie) { return response.setHeader('Set-Cookie', cookie); });
        response.writeHead(this.httpCode, headers);
        if (this.body) {
            response.write(this.body);
            if (this.body.length > 1024)
                log.info('Sending %s Kb (as %s)', Math.round(this.body.length / 1024), this.mimeType);
            else
                log.info('Sending %s bytes (as %s)', this.body.length, this.mimeType);
        }
        response.end();
        log.info('<< REQUEST: Complete');
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
/*
 * Root object for the application is the Site.
 * The site is in itself a Resource and is accessed via the root / in a url.
*/
var Site = (function (_super) {
    __extends(Site, _super);
    function Site(siteName, parent) {
        _super.call(this, parent);
        // private _name: string = "site";
        this._version = exports.version;
        this._siteName = 'site';
        this._home = '/';
        this._pathCache = {};
        this._filters = {};
        this.enableFilters = false;
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
    /*
     * Returns the direction toward the resource in the given route.
     * The Direction object returned may point directly to the resource requested or
     * may point to a resource that will lead to the requested resource
    */
    Site.prototype._getDirection = function (route, verb) {
        if (verb === void 0) { verb = 'GET'; }
        var log = internals.log().child({ func: 'Site._getDirection' });
        var cachedPath = this._pathCache[route.pathname];
        if (cachedPath) {
            var direction = new Direction();
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
            return 'site';
        },
        enumerable: true,
        configurable: true
    });
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
    // Output to response the given error following the mime type in format.
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
                response.write('<html><body style="font-family:arial;">');
                response.write('<h1>relaxjs: the resource request caused an error.</h1>');
                response.write('<h2>' + error.name + '</h2>');
                response.write('<h3 style="color:red;">' + _.escape(error.message) + '</h3><hr/>');
                response.write('<pre>' + _.escape(error.stack) + '</pre>');
                response.write('<body></html>');
                break;
            case 'application/xml':
            case 'text/xml':
                var builder = new xml2js.Builder({ rootName: 'relaxjs' });
                response.write(builder.buildObject(errObj));
                break;
            default:
                response.write(JSON.stringify(errObj));
                break;
        }
        response.end();
    };
    /*
     * Set a user callback function to be executed on every request.
     */
    Site.prototype.addRequestFilter = function (name, filterFunction) {
        this._filters[name] = filterFunction;
        console.log('Adding filter', _.keys(this._filters));
    };
    Site.prototype.deleteRequestFilter = function (name) {
        if (name in this._filters) {
            delete this._filters[name];
            return true;
        }
        return false;
        // return ( _.remove( this._filters, (f) => f === filterFunction ) !== undefined );
    };
    Site.prototype.deleteAllRequestFilters = function () {
        this._filters = {};
        return true;
    };
    /*
     * Execute all the active filters, collect their returned data and post all of them in the returned promise.
    */
    Site.prototype._checkFilters = function (route, body, response) {
        var self = this;
        var later = Q.defer();
        if (!self.enableFilters || Object.keys(self._filters).length === 0) {
            later.resolve({});
            return later.promise;
        }
        // All filters call are converted to promise returning functions and stored in an array
        var filtersCalls = _.map(_.values(self._filters), function (f) { return Q.nfcall(f.bind(self, route, body)); });
        // Filter the request: execute all the filters (the first failing will trigger a fail and it will
        // not waiting for the rest of the batch)
        Q.all(filtersCalls).then(function (dataArr) {
            var filterData = {};
            _.each(_.keys(self._filters), function (name, i) {
                if (dataArr[i])
                    filterData[name] = dataArr[i];
            });
            // console.log('filters data', filterData );
            later.resolve(filterData);
        }).fail(function (err) {
            later.reject(err);
        });
        return later.promise;
    };
    /*
     * Create a Server for the site and manage all the requests by routing them to the appropriate resource
    */
    Site.prototype.serve = function () {
        var _this = this;
        var self = this;
        var srv = http.createServer(function (msg, response) {
            // here we need to route the call to the appropriate class:
            var route = routing.fromRequestResponse(msg, response);
            var site = _this;
            var log = internals.log().child({ func: 'Site.serve' });
            _this._cookies = route.cookies; // The client code can retrieved the cookies using this.getCookies();
            log.info('>> REQUEST: %s', route.verb);
            log.info('      PATH: %s %s', route.pathname, route.query);
            log.info('Out FORMAT: %s', route.outFormat);
            log.info(' In FORMAT: %s', route.inFormat);
            if (site[msg.method.toLowerCase()] === undefined) {
                log.error('%s request is not supported ');
                return;
            }
            // Parse the data received with this request
            internals.parseRequestData(msg, route.inFormat).then(function (bodyData) {
                self._checkFilters(route, bodyData, response).then(function (allFiltersData) {
                    // Execute the HTTP request
                    site[msg.method.toLowerCase()](route, bodyData, allFiltersData).then(function (reply) {
                        reply.serve(response);
                    }).fail(function (error) {
                        if (error.httpCode >= 300)
                            log.error("HTTP " + msg.method + " failed : " + error.httpCode + " : " + error.name + " - " + error.message);
                        self._outputError(response, error, route.outFormat);
                    }).done();
                }).fail(function (error) {
                    if (error.httpCode >= 300)
                        log.error("HTTP " + msg.method + " failed : " + error.httpCode + " : " + error.name + " - " + error.message);
                    self._outputError(response, error, route.outFormat);
                });
            }).fail(function (error) {
                log.error("HTTP " + msg.method + " failed : " + error.httpCode + " : request body could not be parsed: " + error.name + " - " + error.message);
                self._outputError(response, error, route.outFormat);
            });
        }); // End http.createServer()
        return srv;
    };
    Site.prototype.setHome = function (path) {
        this._home = path;
    };
    Site.prototype.setTempDirectory = function (path) {
        this._tempDir = path;
        internals.setMultipartDataTempDir(path);
    };
    // HTTP Verb functions --------------------
    Site.prototype.head = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
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
            return res.head(route, filterData);
        }
        if (self._home === '/') {
            return internals.viewDynamic(self.name, this);
        }
        else {
            log.info('HEAD is redirecting to "%s"', self._home);
            return internals.redirect(self._home);
        }
    };
    Site.prototype.get = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
        var self = this;
        var log = internals.log().child({ func: 'Site.get' });
        log.info('route: %s', route.pathname);
        //log.info(' FORMAT: %s', route.outFormat);
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
            return res.get(route, filterData);
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
    Site.prototype.post = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
        var self = this;
        var log = internals.log().child({ func: 'Site.post' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'POST');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('POST on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.post(direction.route, body, filterData);
        }
        return internals.promiseError(internals.format('[error] Invalid in request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.patch = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
        var self = this;
        var log = internals.log().child({ func: 'Site.patch' });
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PATCH');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PATCH on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.patch(direction.route, body, filterData);
        }
        return internals.promiseError(internals.format('[error] Invalid in request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.put = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
        var log = internals.log().child({ func: 'Site.put' });
        var self = this;
        if (route.path.length > 1) {
            var direction = self._getDirection(route, 'PUT');
            if (!direction)
                return internals.promiseError(internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname);
            var res = (direction.resource);
            log.info('PUT on resource "%s"', res.name);
            route.path = direction.route.path;
            return res.put(direction.route, body, filterData);
        }
        return internals.promiseError(internals.format('[error] Invalid PUT request "{0}"', route.pathname), route.pathname);
    };
    Site.prototype.delete = function (route, body, filterData) {
        if (filterData === void 0) { filterData = {}; }
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
            return res.delete(direction.route, filterData);
        }
        return internals.promiseError(internals.format('[error] Invalid DELETE request "{0}"', route.pathname), route.pathname);
    };
    Site._instance = null;
    return Site;
})(Container);
exports.Site = Site;
/*
 * ResourcePlayer absorbs a user defined resource and execute the HTTP requests.
 * The player dispatch requests to the childres resources or invoke user defined
 * response function for each verb.
 * -----------------------------------------------------------------------------------------------------------------------------
*/
var ResourcePlayer = (function (_super) {
    __extends(ResourcePlayer, _super);
    // public data = {};
    function ResourcePlayer(res, parent) {
        _super.call(this, parent);
        this._template = '';
        this._parameters = {};
        this.filtersData = {};
        var self = this;
        self.setName(res.name);
        self._template = res.view;
        self._layout = res.layout;
        self._paramterNames = res.urlParameters ? res.urlParameters : [];
        self._parameters = {};
        self._outFormat = res.outFormat;
        self._onGet = res.onGet;
        self._onPost = res.onPost;
        self._onPatch = res.onPatch;
        self._onDelete = res.onDelete;
        self._onPut = res.onPut;
        // Add children resources if available
        if (res.resources) {
            _.each(res.resources, function (child, index) {
                self.add(child);
            });
        }
        // Merge the data into this object to easy access in the view.
        self._updateData(res.data);
    }
    ResourcePlayer.prototype.setOutputFormat = function (fmt) {
        this._outFormat = fmt;
    };
    Object.defineProperty(ResourcePlayer.prototype, "outFormat", {
        set: function (f) {
            this._outFormat = f;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ResourcePlayer.prototype, "resources", {
        get: function () {
            return this._resources;
        },
        enumerable: true,
        configurable: true
    });
    /*
     * Reads the parameters from a route and store them in the this._parmaters member.
     * Return the number of paramters correcly parsed.
    */
    ResourcePlayer.prototype._readParameters = function (path, generateError) {
        var _this = this;
        if (generateError === void 0) { generateError = true; }
        var log = internals.log().child({ func: this.name + '._readParameters' });
        var counter = 0;
        _.each(this._paramterNames, function (parameterName, idx, list) {
            if (!path[idx + 1]) {
                if (generateError) {
                    log.error('Could not read all the required paramters from URI. Read %d, needed %d', counter, _this._paramterNames.length);
                }
                return counter; // breaks out of the each loop.
            }
            _this._parameters[parameterName] = path[idx + 1];
            counter++;
        });
        log.info('Read %d parameters from request URL: %s', counter, JSON.stringify(this._parameters));
        return counter;
    };
    /*
     * Reset the data property for this object and copy all the
     * elements from the given parameter into it.
     */
    ResourcePlayer.prototype._updateData = function (newData) {
        var self = this;
        self.data = {};
        _.each(newData, function (value, attrname) {
            if (attrname != 'resources') {
                self.data[attrname] = value;
            }
        });
    };
    /*
     * Delivers a reply as Embodiment of the given response through the given promise and
     * in the given outFormat
    */
    ResourcePlayer.prototype._deliverReply = function (later, resResponse, outFormat, deliverAnyFormat) {
        if (deliverAnyFormat === void 0) { deliverAnyFormat = false; }
        var self = this;
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ')._deliverReply' });
        // Force application/json out format for redirect responses
        if (resResponse.httpCode === 303 && resResponse.httpCode === 307) {
            outFormat = 'application/json';
        }
        var mimeTypes = outFormat ? outFormat.split(/[\s,;]+/) : ['application/json'];
        log.info('Formats: %s', JSON.stringify(mimeTypes));
        // Use the template for GET html requests
        if (self._template && (mimeTypes.indexOf('text/html') != -1 || mimeTypes.indexOf('*/*') != -1)) {
            // Here we copy the data into the resource itself and process it through the viewing engine.
            // This allow the code in the view to act in the context of the resourcePlayer.
            self.data = resResponse.data;
            internals.viewDynamic(self._template, self, self._layout).then(function (reply) {
                reply.httpCode = resResponse.httpCode ? resResponse.httpCode : 200;
                reply.location = resResponse.location;
                reply.cookiesData = resResponse.cookiesData;
                later.resolve(reply);
            }).fail(function (err) {
                later.reject(err);
            });
        }
        else {
            var mimeType = undefined;
            // This is orrible, it should be improved in version 0.1.3
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
                    reply.cookiesData = resResponse.cookiesData;
                    later.resolve(reply);
                }).fail(function (err) {
                    later.reject(err);
                });
            }
            else {
                if (deliverAnyFormat) {
                    later.resolve(new Embodiment(outFormat, 200, resResponse.data));
                }
                else {
                    later.reject(new RxError('output as (' + outFormat + ') is not available for this resource', 'Unsupported Media Type', 415)); // 415 Unsupported Media Type
                }
            }
        }
    };
    // -------------------- HTTP VERB FUNCIONS -------------------------------------
    /*
     * Resource Player HEAD
     * Get the response as for a GET request, but without the response body.
    */
    ResourcePlayer.prototype.head = function (route, filtersData) {
        var self = this; // use to consistently access this object.
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    /*
     * HttpPlayer GET
     * This is the resource player GET:
     * it will call a GET to a child resource or the onGet() for the current resource.
    */
    ResourcePlayer.prototype.get = function (route, filtersData) {
        var self = this; // use to consistently access this object.
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ').get' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        // Dives in and navigates through the path to find the child resource that can answer this GET call
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction.resource) {
                var res = (direction.resource);
                return res.get(direction.route, filtersData);
            }
            else {
                if (_.keys(self._resources).length === 0)
                    return internals.promiseError(internals.format('[error: no child] This resource "{0}" does not have any child resource to navigate to. Path= "{1}"', self.name, JSON.stringify(route.path)), route.pathname);
                else
                    return internals.promiseError(internals.format('[error: no such child] ResourcePlayer GET could not find a Resource for "{0}"', JSON.stringify(route.path)), route.pathname);
            }
        }
        // 2 - Read the parameters from the route
        log.info('GET Target Found : %s (requires %d parameters)', self.name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new RxError('Not enough paramters available in the URI ', 'GET ' + self.name, 404));
                return later.promise;
            }
        }
        // Set the cach to invoke this resource for this path directly next time
        site().setPathCache(route.pathname, { resource: this, path: route.path });
        // This is the resource that need to answer either with a onGet or directly with data
        var dyndata = {};
        // If the onGet() is defined use id to get dynamic data from the user defined resource.
        if (self._onGet) {
            log.info('Invoking onGet()! on %s (%s)', self.name, route.outFormat);
            this.filtersData = filtersData;
            this._cookies = route.cookies; // The client code can retrieved the cookies using this.getCookies();
            var response = new Response(self);
            response.onOk(function (resresp) {
                self._updateData(resresp.data);
                self._deliverReply(later, resresp, self._outFormat ? self._outFormat : route.outFormat, self._outFormat !== undefined);
            });
            response.onFail(function (rxErr) { return later.reject(rxErr); });
            try {
                self._onGet(route.query, response);
            }
            catch (error) {
                later.reject(error);
            }
            return later.promise;
        }
        // 4 - Perform the default GET that is: deliver the data associated with this resource
        log.info('Returning static data from %s', self.name);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, self._outFormat ? self._outFormat : route.outFormat);
        return later.promise;
    };
    /*
     * HttpPlayer DELETE
     * Deletes the specified resource (as identified in the URI within the route).
    */
    ResourcePlayer.prototype.delete = function (route, filtersData) {
        var self = this; // use to consistently access this object.
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ').delete' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        // 1 - Dives in and navigates through the path to find the child resource that can answer this DELETE call
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('DELETE on resource "%s"', res.name);
                return res.delete(direction.route, filtersData);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        // 2 - Read the parameters from the route
        log.info('DELETE Target Found : %s (requires %d parameters)', self.name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new RxError('Not enough paramters available in the URI ', 'DELETE ' + self.name, 404));
                return later.promise;
            }
        }
        // If the onDelete() is defined use it to invoke a user define delete.
        if (self._onDelete) {
            log.info('call onDelete() for %s', self.name);
            this._cookies = route.cookies; // The client code can retrieved the cookies using this.getCookies();
            this.filtersData = filtersData;
            var response = new Response(self);
            response.onOk(function (resresp) {
                self._updateData(resresp.data);
                self._deliverReply(later, resresp, self._outFormat ? self._outFormat : route.outFormat);
            });
            response.onFail(function (rxErr) { return later.reject(rxErr); });
            try {
                this._onDelete(route.query, response);
            }
            catch (err) {
                later.reject(err);
            }
            return later.promise;
        }
        // 4 - Perform the default DELETE that is: delete this resource
        log.info('Default Delete: Removing resource %s', self.name);
        self.parent.remove(self);
        self.parent = null;
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, self._outFormat ? self._outFormat : route.outFormat);
        return later.promise;
    };
    /*
     * HttpPlayer POST
     * Asks the resource to create a new subordinate of the web resource identified by the URI.
     * The body sent to a post must contain the resource name to be created.
    */
    ResourcePlayer.prototype.post = function (route, body, filtersData) {
        var self = this; // use to consistently access this object.
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ').post' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        // Dives in and navigates through the path to find the child resource that can answer this POST call
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('POST on resource "%s"', res.name);
                return res.post(direction.route, body, filtersData);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        // 2 - Read the parameters from the route
        log.info('POST Target Found : %s (requires %d parameters)', self.name, paramCount);
        if (paramCount > 0) {
            // In a POST not finding all the paramters expeceted should not fail the call.
            self._readParameters(route.path, false);
        }
        // Call the onPost() for this resource (user code)
        if (self._onPost) {
            log.info('calling onPost() for %s', self.name);
            this.filtersData = filtersData;
            this._cookies = route.cookies; // The client code can retrieved the cookies using this.getCookies();
            var response = new Response(self);
            response.onOk(function (resresp) {
                self._deliverReply(later, resresp, self._outFormat ? self._outFormat : route.outFormat);
            });
            response.onFail(function (rxErr) { return later.reject(rxErr); });
            try {
                self._onPost(route.query, body, response);
            }
            catch (err) {
                later.reject(new RxError(err));
            }
            return later.promise;
        }
        // 4 - Perform the default POST that is: set the data directly
        log.info('Adding data for %s', self.name);
        self._updateData(body);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, self._outFormat ? self._outFormat : route.outFormat);
        return later.promise;
    };
    /*
     * HttpPlayer PATCH
     * Applies partial modifications to a resource (as identified in the URI).
    */
    ResourcePlayer.prototype.patch = function (route, body, filtersData) {
        var self = this; // use to consistently access this object.
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ').patch' });
        var paramCount = self._paramterNames.length;
        var later = Q.defer();
        // 1 - Dives in and navigates through the path to find the child resource that can answer this POST call
        if (route.path.length > (1 + paramCount)) {
            var direction = self._getStepDirection(route);
            if (direction) {
                var res = (direction.resource);
                log.info('PATCH on resource "%s"', res.name);
                return res.patch(direction.route, body, filtersData);
            }
            else {
                return internals.promiseError(internals.format('[error] Resource not found "{0}"', route.pathname), route.pathname);
            }
        }
        // 2 - Read the parameters from the route
        log.info('PATCH Target Found : %s (requires %d parameters)', self.name, paramCount);
        if (paramCount > 0) {
            if (self._readParameters(route.path) < paramCount) {
                later.reject(new RxError('Not enough paramters available in the URI ', 'PATCH ' + self.name, 404));
                return later.promise;
            }
        }
        // 3 - call the resource defined function to respond to a PATCH request
        if (self._onPatch) {
            log.info('calling onPatch() for %s', self.name);
            this.filtersData = filtersData;
            this._cookies = route.cookies; // The client code can retrieved the cookies using this.getCookies();
            var response = new Response(self);
            response.onOk(function (resresp) {
                self._updateData(resresp.data);
                self._deliverReply(later, resresp, self._outFormat ? self._outFormat : route.outFormat);
            });
            response.onFail(function (rxErr) { return later.reject(rxErr); });
            try {
                self._onPatch(route.query, body, response);
            }
            catch (err) {
                later.reject(new RxError(err));
            }
            return later.promise;
        }
        // 4 - Perform the default PATH that is set the data directly
        log.info('Updating data for %s', self.name);
        self._updateData(body);
        var responseObj = { result: 'ok', httpCode: 200, data: self.data };
        self._deliverReply(later, responseObj, self._outFormat ? self._outFormat : route.outFormat);
        return later.promise;
    };
    /*
     * HttpPlayer PUT
     * Asks that the enclosed entity be stored under the supplied URI.
     * The body sent to a post does not contain the resource name to be stored since that name is the URI.
    */
    ResourcePlayer.prototype.put = function (route, body, filtersData) {
        var self = this; // use to consistently access this object.
        var log = internals.log().child({ func: 'ResourcePlayer(' + self.name + ').put' });
        var later = Q.defer();
        _.defer(function () {
            later.reject(new RxError('Not Implemented'));
        });
        return later.promise;
    };
    ResourcePlayer.version = exports.version;
    return ResourcePlayer;
})(Container);
exports.ResourcePlayer = ResourcePlayer;
function site(name) {
    return Site.$(name);
}
exports.site = site;
//# sourceMappingURL=relaxjs.js.map