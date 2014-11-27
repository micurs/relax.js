///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/lodash/lodash.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./relaxjs.ts' />

import http = require("http");
import fs = require('fs');
import url = require('url');
import path = require('path');
import Q = require('q');
import mime = require('mime');
import _ = require("lodash");
// _.str = require('underscore.string');

import relaxjs = require('./relaxjs');

// Route: helper class to routing requests to the correct resource
export class Route {
  verb: string;
  static : boolean = true; // if true it means this rout is mapping to a file
  pathname : string;
  path : string[];
  query: any;
  format: string;

  constructor( uri?: string ) {
    if ( uri ) {
      var parsedUrl : url.Url = url.parse(uri, true);
      var extension = path.extname(parsedUrl.pathname)
      var resources : string[] = parsedUrl.pathname.split('/');//.splice(0,1);
      if ( parsedUrl.pathname.charAt(0) == '/' ) {
        resources.unshift('site');
      }
      resources = _.map(resources, (item) => decodeURI(item) );

      this.pathname = parsedUrl.pathname;
      this.query = parsedUrl.query;
      this.path = _.filter( resources, (res) => res.length>0 );
      // console.log(_.str.sprintf('Route Path:"%s" Extension:"%s"', JSON.stringify(this.path), extension ) );
      this.static = ( extension.length>0 );
      this.format = 'application/json';
    }
  }

  // Create a new Route with a new path without the first item
  stepThrough( stpes: number ) : Route {
    var newRoute : Route = new Route();
    newRoute.verb = this.verb;
    newRoute.path = _.map(this.path, (v) => _.clone(v) );
    newRoute.static = this.static;
    newRoute.pathname = this.pathname;
    newRoute.query = this.query;
    newRoute.format = this.format;
    newRoute.path.splice(0,stpes);
    return newRoute;
  }

  getNextStep() : string {
    // console.log('[Route.nextStep] '+this.path[0] );
    return this.path[0];
  }
}

export class Direction {
  resource : relaxjs.Container;
  route: Route;
  verb: string;
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
  if ( !request.url )
    request.url = '/';
  var route = new Route( request.url );
  if ( request.headers['content-type'] )
    route.format = request.headers['content-type'];
  else if ( request.headers['accept'] ) {
    route.format = request.headers['accept'];
  }
  else
    route.format = 'application/json';
  route.verb = request.method;
  return route;
}
