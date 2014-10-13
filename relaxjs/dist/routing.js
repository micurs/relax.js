var url = require('url');
var path = require('path');
var _ = require("underscore");
_.str = require('underscore.string');
var Route = (function () {
    function Route() {
        this.static = true;
    }
    return Route;
})();
exports.Route = Route;
function fromUrl(request) {
    console.log('[Routing.fromUrl] Original Request: ' + request.url);
    if (!request.url)
        request.url = '/';
    var reqToRoute = url.parse(request.url, true);
    var extension = path.extname(reqToRoute.pathname);
    var resources = reqToRoute.pathname.split('/');
    resources.unshift('site');
    var route = new Route();
    route.pathname = reqToRoute.pathname;
    route.query = reqToRoute.search;
    route.path = _.filter(resources, function (res) { return res.length > 0; });
    console.log('[Routing.fromUrl] Path (' + route.path.length + ') -> ' + route.path);
    console.log('[Routing.fromUrl] Extension: (' + extension + ')');
    route.static = (extension.length > 0);
    return route;
}
exports.fromUrl = fromUrl;
