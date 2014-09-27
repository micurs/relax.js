///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
var url = require('url');
var path = require('path');
var _ = require('underscore');

(function (Routing) {
    var Route = (function () {
        function Route() {
            this.isPublic = true;
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
        console.log('[Routing.fromUrl] ' + request.url);

        var reqToRoute = url.parse(request.url, true);
        var resources = reqToRoute.pathname.split('/');

        console.log('[Routing.fromUrl] Route has #' + resources.length);
        console.log('[Routing.fromUrl] ' + _.reduce(resources, function (mem, item) {
            return mem += ' , ' + item;
        }));
        var extension = path.extname(reqToRoute.pathname);
        console.log('[Routing.fromUrl] ' + extension);
        if (resources[1] == 'public' || extension.length > 0) {
            console.log('[Routing.fromUrl] Public request');
            return { isPublic: true, pathname: reqToRoute.pathname, query: reqToRoute.search };
        } else {
            // Here we need to do some magic!
            console.log('[Routing.fromUrl] Resource request');
            return { isPublic: false, pathname: reqToRoute.pathname, query: reqToRoute.search };
        }
    }
    Routing.fromUrl = fromUrl;
})(exports.Routing || (exports.Routing = {}));
var Routing = exports.Routing;
