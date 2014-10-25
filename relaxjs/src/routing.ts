///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./relaxjs.ts' />

import http = require("http");
import fs = require('fs');
import url = require('url');
import path = require('path');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");
_.str = require('underscore.string');

import relaxjs = require('./relaxjs');

// Route: helper class to routing requests to the correct resource
export class Route {
  verb: string;
  static : boolean = true; // if true it means this rout is mapping to a file
  pathname : string;
  path : string[];
  query: any;

  // Create a new Route with a new path without the first item
  stepThrough( stpes: number ) : Route {
    var newRoute : Route = new Route();
    newRoute.verb = this.verb;
    newRoute.path = _.map(this.path, _.clone);
    newRoute.static = this.static;
    newRoute.pathname = this.pathname;
    newRoute.query = this.query;
    newRoute.path.splice(0,stpes);
    return newRoute;
  }

  getNextStep() : string {
    // console.log('[Route.nextStep] '+this.path[0] );
    return this.path[0];
  }
}

export class Direction {
  resource : relaxjs.HttpPlayer;
  route: Route;
}

// --------------------------------------------------------------
// GET /home/users?id=100
// becomes
// home.users.get(100)
// PUT /home/users?id=100
// becomes
//  home.users.put( 100, data)
// --------------------------------------------------------------
export function fromUrl( request: http.ServerRequest ) : Route {
  var ctx = '[Routing.fromUrl] ';
  // console.log( _.str.sprintf('%s Routing url: %s',ctx,request.url) );

  if ( !request.url )
    request.url = '/';

  //console.log( _.str.sprintf('%s http.ServerRequest Body:\n%s\n-------',ctx,JSON.stringify(request.read(),null, ' ')));

  var parsedUrl : url.Url = url.parse(request.url, true);
  var extension = path.extname(parsedUrl.pathname)
  var resources : string[] = parsedUrl.pathname.split('/');//.splice(0,1);
  resources.unshift('site');
  resources = _(resources).map( (item) => decodeURI(item) );

  var route = new Route();
  route.pathname = parsedUrl.pathname;
  route.query = parsedUrl.query;
  route.path = _.filter( resources, (res) => res.length>0 );
  // console.log(_.str.sprintf('%s Path:"%s" Extension:"%s"',ctx, route.path, extension ) );
  route.static = ( extension.length>0 ) ;

  return route;
}
