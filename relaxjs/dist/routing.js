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
            this.format = 'application/json';
        }
    }
    Route.prototype.stepThrough = function (stpes) {
        var newRoute = new Route();
        newRoute.verb = this.verb;
        newRoute.path = _.map(this.path, function (v) { return _.clone(v); });
        newRoute.static = this.static;
        newRoute.pathname = this.pathname;
        newRoute.query = this.query;
        newRoute.format = this.format;
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
    if (request.headers['content-type'])
        route.format = request.headers['content-type'];
    else if (request.headers['accept']) {
        route.format = request.headers['accept'];
    }
    else
        route.format = 'application/json';
    route.verb = request.method;
    return route;
}
exports.fromUrl = fromUrl;
//# sourceMappingURL=routing.js.map