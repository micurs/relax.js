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

    var reqToRoute : url.Url = url.parse(request.url, true);
    var resources : string[] = reqToRoute.pathname.split('/');//.splice(0,1);

    console.log('[Routing.fromUrl] Route has #'+ resources.length );
    console.log('[Routing.fromUrl] '+ _.reduce( resources, ( mem, item ) => mem += ' , '+item ) );
    var extension = path.extname(reqToRoute.pathname)
    console.log('[Routing.fromUrl] '+ extension);
    if ( resources[1] == 'public' || extension.length > 0 ) {
      console.log('[Routing.fromUrl] Public request');
      return { isPublic : true, pathname: reqToRoute.pathname, query : reqToRoute.search };
    }
    else {
      // Here we need to do some magic!
      console.log('[Routing.fromUrl] Resource request');
      return { isPublic : false, pathname: reqToRoute.pathname, query : reqToRoute.search };
    }
  }

}
