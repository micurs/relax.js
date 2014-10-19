var url = require('url');
var path = require('path');
var _ = require("underscore");
_.str = require('underscore.string');
var Route = (function () {
    function Route() {
        this.static = true;
    }
    Route.prototype.stepThrough = function (stpes) {
        var newRoute = new Route();
        newRoute.verb = this.verb;
        newRoute.path = _.map(this.path, _.clone);
        newRoute.static = this.static;
        newRoute.pathname = this.pathname;
        newRoute.query = this.query;
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
    var ctx = '[Routing.fromUrl] ';
    if (!request.url)
        request.url = '/';
    var reqToRoute = url.parse(request.url, true);
    var extension = path.extname(reqToRoute.pathname);
    var resources = reqToRoute.pathname.split('/');
    resources.unshift('site');
    resources = _(resources).map(function (item) { return decodeURI(item); });
    var route = new Route();
    route.pathname = reqToRoute.pathname;
    route.query = reqToRoute.search;
    route.path = _.filter(resources, function (res) { return res.length > 0; });
    route.static = (extension.length > 0);
    return route;
}
exports.fromUrl = fromUrl;
