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

// Generic interface for a resource
// ===================================================================================
export interface Resource {
  Name: string;
  get( route : routing.Route ) : Q.Promise<Embodiment> ;
}

// Every resource is converted to their embodiment before they can be served
// ===================================================================================
export class Embodiment {

  constructor( private data : Buffer, private mimeType: string ) { }

  serve(response: http.ServerResponse) : void {
    console.log('[serve] lenght:'+this.data.length);
    response.writeHead(200, { 'Content-Type' : this.mimeType, 'Content-Length': this.data.length } );
    response.write(this.data);
    response.end();
  }

}

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
// ===================================================================================
export class Site implements Resource {
  private static _instance : Site = null;
  public Name: string = "site";

  private _resources:any = {};
  private _version : string = '0.0.1';

  constructor( public siteName:string ) {
    if(Site._instance){
      throw new Error("Error: Only one site is allowed.");
    }
    Site._instance = this;
  }

  public static $( name:string ):Site
  {
    if(Site._instance === null) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

  addResource( resource : Resource ) : Boolean {
    resource['_version'] = this._version;
    resource['siteName'] = this.siteName;
    this._resources[resource.Name] = resource;
    console.log( _.str.sprintf('[addResource] : %s', JSON.stringify(_.keys(this._resources)) ) );
    return false;
  }

  serve( port:number = 3000 ) : http.Server {
    console.log('Site '+ this.siteName + ' listening on port:'+ port );
    return http.createServer( (request, response) => {
      console.log('\n========================');
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromUrl(request);

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
    var contextLog = '['+this.Name+'.get] ';
    // console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

    if ( route.static ) {
      console.log( contextLog + 'Static -> '+ route.pathname );
      return internals.viewStatic( route.pathname );
    }
    else {
      console.log( contextLog + 'Dynamic -> following the path... ' );
      if ( route.path.length > 1 ) {
        if ( route.path[1] in this._resources ) {
          console.log( contextLog + 'Found Resource for '+ route.path[1] );
          var partialRoute = _.clone(route);
          partialRoute.path = route.path;
          return this._resources[route.path[1]].get( partialRoute );
        }
      }
      // console.log( contextLog + 'Resources : [ '+ JSON.stringify(_.values(this._resources, null, '  ')) +' ]' );
      return internals.viewDynamic(this.Name, this );
    }
  }
}
