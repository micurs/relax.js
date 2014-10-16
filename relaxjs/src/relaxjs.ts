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
  setName( newName:string ) : void ;
  get( route : routing.Route ) : Q.Promise<Embodiment> ;
  post( route : routing.Route ) : Q.Promise<Embodiment> ;
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
  addResource( typeName: string, newRes: Resource ) {
    newRes['_version'] = site().version;
    newRes['siteName'] = site().siteName;
    newRes.setName(typeName);
    var childArray = this._resources[typeName];
    if ( childArray === undefined )
      this._resources[typeName] = [ newRes ];
    else {
      childArray.push(newRes);
    }
  }
  // Add a resource of the given type as child
  add( newRes: Resource ) {
    newRes['_version'] = site().version;
    newRes['siteName'] = site().siteName;
    var typeName = newRes.name();
    var childArray = this._resources[typeName];
    if ( childArray === undefined )
      this._resources[typeName] = [ newRes ];
    else {
      childArray.push(newRes);
    }
  }

}

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
export class Site extends Container implements Resource {
  private _name: string = "site";
  private static _instance : Site = null;
  private _version : string = '0.0.1';
  private _siteName : string = 'site';

  constructor( siteName:string ) {
    super();
    this._siteName = siteName;
    if(Site._instance){
      throw new Error("Error: Only one site is allowed.");
    }
    Site._instance = this;
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get version():string {
    return this._version;
  }
  get siteName():string {
    return this._siteName;
  }

  public static $( name?:string ):Site
  {
    if(Site._instance === null && name ) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

  serve() : http.Server {
    return http.createServer( (msg: http.ServerRequest , response : http.ServerResponse) => {
      console.log('\n');
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromUrl(msg);

      // TODO : add support for post, delete, update
      this.get( route )
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

  get( route : routing.Route ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    // console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

    if ( route.static ) {
      console.log( contextLog + 'Static -> '+ route.pathname );
      return internals.viewStatic( route.pathname );
    }
    else {
      if ( route.path.length > 1 ) {
        var innerRoute : routing.Route = route.stepThrough(1);
        console.log('[TEST] newRoute is '+ innerRoute.getNextStep() );
        console.log( _.str.sprintf('%s Dynamic -> following the next step of innerRoute: "%s" ',contextLog, innerRoute.getNextStep() ) );
        if ( innerRoute.getNextStep() in this._resources ) {
          var childResource = super.getFirstMatching(innerRoute.getNextStep());
          if ( childResource ) {
            console.log(_.str.sprintf('%s Found Resource for "%s" -> %s',contextLog,innerRoute.getNextStep(),childResource.name() ));
            return childResource.get( innerRoute );
          }
        }
      }
      // console.log( contextLog + 'Resources : [ '+ JSON.stringify(_.values(this._resources, null, '  ')) +' ]' );
      return internals.viewDynamic(this.name(), this );
    }
  }

  post( req : routing.Route ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< Embodiment >();
    return laterAction.promise;
  }

}

export function site( name?: string ) : Site {
  return Site.$(name);
}
