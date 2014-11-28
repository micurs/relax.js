var url = require('url');
var path = require('path');
var _ = require("lodash");
var Route = (function () {
    function Route(uri) {
        this.static = true;
        if (uri) {
            var parsedUrl = url.parse(uri, true);
            var extension = path.extname(parsedUrl.pathname);
            var resources = parsedUrl.pathname.split('/');
            if (parsedUrl.pathname.charAt(0) == '/') {
                resources.unshift('site');
            }
            resources = _.map(resources, function (item) { return decodeURI(item); });
            this.pathname = parsedUrl.pathname;
            this.query = parsedUrl.query;
            this.path = _.filter(resources, function (res) { return res.length > 0; });
            this.static = (extension.length > 0);
        }
    }
    Route.prototype.stepThrough = function (stpes) {
        var newRoute = new Route();
        newRoute.verb = this.verb;
        newRoute.path = _.map(this.path, function (v) { return _.clone(v); });
        newRoute.static = this.static;
        newRoute.pathname = this.pathname;
        newRoute.query = this.query;
        newRoute.outFormat = this.outFormat;
        newRoute.inFormat = this.inFormat;
        newRoute.path.splice(0, stpes);
        return newRoute;
    };
    Route.prototype.getNextStep = function () {
        return this.path[0];
    };
    return Route;
})();
exports.Route = Route;
var Direction = (function () {
    function Direction() {
    }
    return Direction;
})();
exports.Direction = Direction;
function fromUrl(request) {
    if (!request.url)
        request.url = '/';
    var route = new Route(request.url);
    if (request.headers['accept']) {
        route.outFormat = request.headers['accept'];
    }
    if (request.headers['content-type']) {
        route.inFormat = request.headers['content-type'];
    }
    if (!request.headers['accept'] && request.headers['content-type']) {
        route.outFormat = request.headers['content-type'];
    }
    if (request.headers['accept'] && !request.headers['content-type']) {
        route.inFormat = request.headers['accept'];
    }
    if (!request.headers['accept'] && !request.headers['content-type']) {
        route.inFormat = 'application/json';
        route.outFormat = 'application/json';
    }
    route.verb = request.method;
    return route;
}
exports.fromUrl = fromUrl;
//# sourceMappingURL=routing.js.map