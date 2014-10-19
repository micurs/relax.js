///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
/*
 ///<reference path='./internals.ts' />
 ///<reference path='./routing.ts' />
*/

import http = require("http");
import fs = require("fs");
import url = require('url');
import path = require('path');
import Q = require('q');
import _ = require("underscore");
_.str = require('underscore.string');

import internals = require('./internals');
import routing = require('./routing');

exports.routing = routing;
// exports.resources = resources;

export function relax() : void {
  console.log('relax');
}

// Relax Request: a route plus some data
export class Request {
  route: routing.Route;
  data: Buffer;
}

// Generic interface for a resource
export interface ResourcePlayer {
  name(): string;
  setName( newName:string ) : void ;
  get( route : routing.Route ) : Q.Promise<Embodiment> ;
  post( route : routing.Route ) : Q.Promise<Embodiment> ;
}


export interface Resource {
  view: string;
  layout?: string;
  data?: any;
  onGet?: () => any
}

// A Resource map is a collection of Resource arrays.
// Each arrray contain resource of the same type.
export interface ResourceMap {
  [name: string]: ResourcePlayer [];
}

// Every resource is converted to their embodiment before they can be served
export class Embodiment {

  constructor( private data : Buffer, private mimeType: string ) { }

  serve(response: http.ServerResponse) : void {
    if ( this.data.length>1024 )
      console.log( _.str.sprintf('[serve] %s Kb', _.str.numberFormat(this.data.length/1024,1) ) );
    else
      console.log( _.str.sprintf('[serve] %s bytes', _.str.numberFormat(this.data.length) ) );
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
  getFirstMatching( typeName: string ) : ResourcePlayer {
    var childArray = this._resources[typeName];
    if ( childArray === undefined ) {
      return null;
    }
    return childArray[0];
  }
  // Add a resource of the given type as child
  add( typeName: string, newRes: Resource ) : void {
    newRes['_version'] = site().version;
    newRes['siteName'] = site().siteName;
    var resourcePlayer : DynamicHtml = new DynamicHtml(newRes);
    resourcePlayer.setName(typeName);
    var indexName = _.str.slugify(typeName);
    var childArray = this._resources[indexName];
    if ( childArray === undefined )
      this._resources[indexName] = [ resourcePlayer ];
    else {
      childArray.push(resourcePlayer);
    }
    console.log(_.str.sprintf('- "%s" [%d] (%s)', typeName, this._resources[indexName].length, indexName ) );
  }

  getByIdx( name: string, idx: number ) : ResourcePlayer {
    return this._resources[name][idx];
  }

  childTypeCount( typeName: string ) : number {
    return this._resources[typeName].length;
//    return Object.keys(this._resources[typeName]).length;
  }

  childCount() : number {
    var counter : number = 0;
    _.each< ResourcePlayer[]>( this._resources, ( arrayItem : ResourcePlayer[] ) => { counter += arrayItem.length; } );
    return counter;
  }

  getDirection( route : routing.Route ) : routing.Direction {
    var ctx = '[Container.getDirection]';

    var direction: routing.Direction = new routing.Direction();
    direction.route = route.stepThrough(1);
    var childResName = direction.route.getNextStep();
    console.log( _.str.sprintf('%s following the next step in: "%s" ',ctx, direction.route.path ) );
    if ( childResName in this._resources ) {
      var childResCount = this.childTypeCount(childResName);
      if ( childResCount == 1 ) {
        console.log( _.str.sprintf('%s ONLY ONE matching "%s" ',ctx, childResName ) );
        direction.resource = this.getFirstMatching(childResName);
      }
      else if ( childResCount > 1 ) {
        var idx:number = 0;
        if ( direction.route.path[1] !== undefined ) {
          idx = parseInt(direction.route.path[1]) ;
          if ( isNaN(idx) ) {
            idx = 0;
          }
          else {
            direction.route = direction.route.stepThrough(1);
          }
        }
        console.log( _.str.sprintf('%s [%s] matching "%s" ',ctx, idx, childResName ) );
        direction.resource = this.getByIdx(childResName, idx);
      }
    }
    return direction;
  }

}

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
export class Site extends Container implements ResourcePlayer {
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

  public static $( name?:string ):Site {
    if(Site._instance === null && name ) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

  serve() : http.Server {
    return http.createServer( (msg: http.ServerRequest , response : http.ServerResponse) => {
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromUrl(msg);

      // TODO : add support for post, delete, update
      this.get( route )
        .then( ( rep : Embodiment ) => {
          rep.serve(response);
        })
        .fail(function (error) {
          response.writeHead(404, {"Content-Type": "text/html"} );
          response.write('Relax.js<hr/>');
          response.write(error);
          response.end();
        })
        .done();
    });
  }

  get( route : routing.Route ) : Q.Promise< Embodiment > {
    var ctx = '['+this.name()+'.get] ';
    // console.log(ctx);
    if ( route.static ) {
      return internals.viewStatic( route.pathname );
    }
    else {
      if ( route.path.length > 1 ) {
        var direction = this.getDirection(route);
        if ( direction.resource ) {
          console.log(_.str.sprintf('%s "%s"',ctx,direction.resource.name() ));
          return direction.resource.get( direction.route );
        }
        else {
          return internals.promiseError( _.str.sprintf('%s ERROR Resource not found or invalid in request "%s"',ctx, route.pathname ), route.pathname );
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

class DynamicHtml extends Container implements ResourcePlayer {
  private _name: string = '';
  private _template: string = '';
  private _layout: string;
  private _dataGetter : () => any;

  constructor( res : Resource ) {
    super();
    this._name = res.view;
    this._template = res.view;
    this._layout = res.layout;
    if ( res.onGet )
      this._dataGetter = res.onGet;
    if ( res.data )
      for (var attrname in res.data) { this[attrname] = res.data[attrname]; }
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get(  route: routing.Route  ) : Q.Promise< Embodiment > {
    var ctx = _.str.sprintf('[HtmlView.%s] get',this._template );

    if ( route.path.length > 1 ) {
      var direction = this.getDirection( route );
      if ( direction.resource )
        return direction.resource.get( direction.route );
      else {
        return internals.promiseError( _.str.sprintf('%s ERROR Resource not found or invalid request "%s"',ctx, route.pathname ), route.pathname );
      }
    }
    else {
      var dyndata: any = {};
      // Here we compute/fetch/create the view data.
      if ( this._dataGetter ) {
        console.log( _.str.sprintf('%s getting resource from callback',ctx) );
        dyndata = this._dataGetter();
      }
      if (dyndata) {
        for (var attrname in dyndata) { this[attrname] = dyndata[attrname]; }
      }
      return internals.viewDynamic(this._template, this, this._layout );
    }
  }

  post( route: routing.Route  ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< Embodiment >();
    return laterAction.promise;
  }
}


class Data extends Container implements ResourcePlayer {
  private _name:string = '';

  constructor( name: string ) {
    super();
    this._name = name;
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get( route: routing.Route ) : Q.Promise< Embodiment > {
    // <todo>return child resource if specified in the path</todo>

    // Here we return the embodiment of the data representing this resource.
    var later = Q.defer< Embodiment >();
    var readFile = Q.denodeify(fs.readFile);
    var dataFile = './data/'+this.name()+'.json';
    readFile( dataFile)
      .then( (content: Buffer ) => {
        later.resolve(new Embodiment(content, 'application/json' ));
      })
      .catch( ( err : Error ) => {
        later.reject( internals.emitCompileViewError('N/A',err, dataFile ) );
      });
    return later.promise;
  }
  post( route: routing.Route  ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< Embodiment >();
    return laterAction.promise;
  }

}

export function site( name?: string ) : Site {
  return Site.$(name);
}
