///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />

import url = require('url');
import path = require('path')
import _ = require('underscore');

export module Routing {

  export class Route {
    isPublic : boolean = true;
    pathname : string;
    query: string;
  }

  // --------------------------------------------------------------
  // GET /home/users?id=100
  // becomes
  // home.users.get(100)
  // PUT /home/users?id=100
  // becomes
  //  home.users.put( 100, data)
  // --------------------------------------------------------------
  export function fromUrl(request) : Route {
    console.log('[Routing.fromUrl] '+request.url);

    if ( !request.url )
      request.url = '/';

    var reqToRoute : url.Url = url.parse(request.url, true);
    var extension = path.extname(reqToRoute.pathname)
    var resources : string[] = reqToRoute.pathname.split('/');//.splice(0,1);
    resources = _.filter( resources, (res) => res.length>0 );

    console.log('[Routing.fromUrl] '+request.url+' has '+ resources.length + ' nodes' );
    if ( resources.length===0 || extension.length===0 ) {
      // Here we need to do some magic!
      console.log('[Routing.fromUrl] '+request.url+' is a Dynamic Resource');
      return { isPublic : false, pathname: reqToRoute.pathname, query : reqToRoute.search };
    }
    else {
      console.log('[Routing.fromUrl] '+request.url+' is a Static Resource');
      return { isPublic : true, pathname: reqToRoute.pathname, query : reqToRoute.search };
    }
  }

}
