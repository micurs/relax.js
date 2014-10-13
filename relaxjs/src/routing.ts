///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />


import fs = require('fs');
import url = require('url');
import path = require('path');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");
_.str = require('underscore.string');

// ================================================================
export class Route {
  verb: string;
  static : boolean = true; // if true it means this rout is mapping to a file
  pathname : string;
  path : string[];
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
  var fname = '[Routing.fromUrl] ';
  console.log(fname+request.url);

  if ( !request.url )
    request.url = '/';

  var reqToRoute : url.Url = url.parse(request.url, true);
  var extension = path.extname(reqToRoute.pathname)
  var resources : string[] = reqToRoute.pathname.split('/');//.splice(0,1);
  resources.unshift('site');

  var route = new Route();
  route.pathname = reqToRoute.pathname;
  route.query = reqToRoute.search;
  route.path = _.filter( resources, (res) => res.length>0 );
  console.log(_.str.sprintf('%s Path:"%s" Extension:"%s"',fname, route.path, extension ) );
  route.static = ( extension.length>0 ) ;
  return route;
}
