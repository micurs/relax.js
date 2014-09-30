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

        if (!request.url)
            request.url = '/';

        var reqToRoute = url.parse(request.url, true);
        var extension = path.extname(reqToRoute.pathname);
        var resources = reqToRoute.pathname.split('/');
        resources = _.filter(resources, function (res) {
            return res.length > 0;
        });

        console.log('[Routing.fromUrl] ' + request.url + ' has ' + resources.length + ' nodes');
        if (resources.length === 0 || extension.length === 0) {
            // Here we need to do some magic!
            console.log('[Routing.fromUrl] ' + request.url + ' is a Dynamic Resource');
            return { isPublic: false, pathname: reqToRoute.pathname, query: reqToRoute.search };
        } else {
            console.log('[Routing.fromUrl] ' + request.url + ' is a Static Resource');
            return { isPublic: true, pathname: reqToRoute.pathname, query: reqToRoute.search };
        }
    }
    Routing.fromUrl = fromUrl;
})(exports.Routing || (exports.Routing = {}));
var Routing = exports.Routing;
