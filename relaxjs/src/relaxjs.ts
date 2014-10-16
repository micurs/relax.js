///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./internals.ts' />
///<reference path='./routing.ts' />
///<reference path='./resources.ts' />

import http = require("http");
import url = require('url');
import path = require('path');
import _ = require("underscore");
_.str = require('underscore.string');

import internals = require('./internals');
import routing = require('./routing');
import resources = require('./resources');

exports.routing = routing;
exports.resources = resources;

export function relax() : void {
  console.log('relax');
}

// Relax Request: a route plus some data
export class Request {
  route: routing.Route;
  data: Buffer;
}

// Generic interface for a resource
export interface Resource {
  name(): string;
  get( route : Request ) : Q.Promise<Embodiment> ;
  post( route : Request ) : Q.Promise<Embodiment> ;
}

// A Resource map is a collection of Resource arrays.
// Each arrray contain resource of the same type.
export interface ResourceMap {
  [name: string]: Resource [];
}

// Every resource is converted to their embodiment before they can be served
export class Embodiment {
  constructor( private data : Buffer, private mimeType: string ) { }
  serve(response: http.ServerResponse) : void {
    console.log('[serve] bytes:'+this.data.length);
    response.writeHead(200, { 'Content-Type' : this.mimeType, 'Content-Length': this.data.length } );
    response.write(this.data);
    response.end();
  }
}

// A container of resources. This class offer helper functions to add and retrieve resources
// child resources
export class Container {
  public _resources:ResourceMap = {};

  constructor() {}

  // Find the first resource of the given type
  getFirstMatching( typeName: string ) : Resource {
    var childArray = this._resources[typeName];
    if ( childArray === undefined ) {
      return null;
    }
    return childArray[0];
  }
  // Add a resource of the given type as child
  addResource( typeName: string, res: Resource ) {
    var childArray = this._resources[typeName];
    if ( childArray === undefined )
      this._resources[typeName] = [ res ];
    else
      childArray.push(res);
  }
}

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
export class Site extends Container implements Resource {
  private _name: string = "site";
  private static _instance : Site = null;
  private _version : string = '0.0.1';

  constructor( public siteName:string ) {
    super();
    if(Site._instance){
      throw new Error("Error: Only one site is allowed.");
    }
    Site._instance = this;
  }

  name(): string { return this._name; }

  public static $( name:string ) : Site
  {
    if(Site._instance === null) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

/*
  addResource( resource : Resource ) : boolean {
    resource['_version'] = this._version;
    resource['siteName'] = this.siteName;
    this._resources[resource.name()].push(resource);
    console.log( _.str.sprintf('[addResource] : %s', JSON.stringify(_.keys(this._resources)) ) );
    return false;
  }
*/

  // Return the server to be used to run this site.
  serve() : http.Server {
    return http.createServer( ( msg: http.ServerRequest , response : http.ServerResponse ) => {
      console.log('\n');
      // here we need to route the call to the appropriate class:
      var rxReq : Request = new Request();
      rxReq.route = routing.fromUrl(msg);

      this.get( rxReq )
        .then( ( rep : Embodiment ) => {

          rep.serve(response);
        })
        .fail(function (error) {
          response.writeHead(404, {"Content-Type": "text/html"} );
          response.write(error);
          response.end();
        })
        .done();
    });
  }

  // Resource interface implementation starts here

  get( req : Request ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    // console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

    if ( req.route.static ) {
      console.log( contextLog + 'Static -> '+ req.route.pathname );
      return internals.viewStatic( req.route.pathname );
    }
    else {
      console.log( contextLog + 'Dynamic -> following the path... ' );
      if ( req.route.path.length > 1 ) {
        if ( req.route.path[1] in this._resources ) {
          console.log( contextLog + 'Found Resource for '+ req.route.path[1] );
          var innerReq = _.clone(req);// We should remove the first item from the path in the innerReq
          var childTypename = req.route.path[1];
          var childResource = super.getFirstMatching(childTypename);
          return childResource.get( innerReq );
        }
      }
      // console.log( contextLog + 'Resources : [ '+ JSON.stringify(_.values(this._resources, null, '  ')) +' ]' );
      return internals.viewDynamic(this.name(), this );
    }
  }

  post( req : Request ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< Embodiment >();
    return laterAction.promise;
  }
}

export function site( name : string ) : Site {
  return Site.$(name);
}
