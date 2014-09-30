///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
var url = require('url');
var path = require('path');
var _ = require('underscore');

(function (Routing) {
    var Route = (function () {
        function Route() {
            this.static = true;
        }
        return Route;
    })();
    Routing.Route = Route;

    // --------------------------------------------------------------
    // GET /home/users?id=100
    // becomes
    // home.users.get(100)
    // PUT /home/users?id=100
    // becomes
    //  home.users.put( 100, data)
    // --------------------------------------------------------------
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
        route.path = _.filter(resources, function (res) {
            return res.length > 0;
        });
        console.log('[Routing.fromUrl] Path (' + route.path.length + ') -> ' + route.path);
        console.log('[Routing.fromUrl] Extension: (' + extension + ')');
        route.static = (extension.length > 0);
        return route;
        /*
        console.log('[Routing.fromUrl] '+request.url+' has '+ resources.length + ' nodes' );
        if ( resources.length===0 || extension.length===0 ) {
        // Here we need to do some magic!
        console.log('[Routing.fromUrl] '+request.url+' is a Dynamic Resource');
        route.isPub
        return { isPublic : false, pathname: reqToRoute.pathname, query : reqToRoute.search };
        }
        else {
        console.log('[Routing.fromUrl] '+request.url+' is a Static Resource');
        return { isPublic : true, pathname: reqToRoute.pathname, query : reqToRoute.search };
        }
        */
    }
    Routing.fromUrl = fromUrl;
})(exports.Routing || (exports.Routing = {}));
var Routing = exports.Routing;
