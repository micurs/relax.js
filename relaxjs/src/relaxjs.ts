/*
 * Relax.js version 0.0.1
 * by Michele Ursino Nov - 2014
*/

///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

import http = require("http");
import querystring = require('querystring');
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
  get( route : routing.Route ) : Q.Promise<Embodiment> ;
  post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
}

export interface DataCallback {
  ( err: Error, data: any ): void;
}

export interface Resource {
  name: string;
  key?: string;
  view?: string;
  layout?: string;
  data?: any;
  resources?: Resource[];
  onGet?: ( query: any, callback: DataCallback ) => void;
  onPost?: ( query: any, body: any, callback: DataCallback) => void;
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
  add( newRes: Resource ) : void {
    newRes['_version'] = site().version;
    newRes['siteName'] = site().siteName;
    var resourcePlayer : ResourceServer = new ResourceServer(newRes);
    var indexName = _.str.slugify(newRes.name);
    var childArray = this._resources[indexName];
    if ( childArray === undefined )
      this._resources[indexName] = [ resourcePlayer ];
    else {
      childArray.push(resourcePlayer);
    }
    console.log(_.str.sprintf('new resource: "%s" [%d] (%s)', newRes.name, this._resources[indexName].length-1, indexName ) );
  }

  getByIdx( name: string, idx: number ) : ResourcePlayer {
    return this._resources[name][idx];
  }

  childTypeCount( typeName: string ) : number {
    if ( this._resources[typeName] )
      return this._resources[typeName].length;
    else
      return 0;
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
    return direction;
  }

}

// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
export class Site extends Container implements ResourcePlayer {
  private static _instance : Site = null;
  private _name: string = "site";
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

  public static $( name?:string ):Site {
    if(Site._instance === null && name ) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get version():string {
    return this._version;
  }
  get siteName():string {
    return this._siteName;
  }

  serve() : http.Server {
    console.log('\n');
    return http.createServer( (msg: http.ServerRequest , response : http.ServerResponse) => {
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromUrl(msg);
      var site : Site = this;
      console.log(msg.method);

      switch( msg.method ) {
        case 'POST': {
            var body : string = '';
            msg.on('data', function (data) {
                body += data;
              });
            msg.on('end', function () {
                console.log("Full Body: " + body);
                var bodyData = querystring.parse(body);
                site.post( route, bodyData )
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
          };
          break;
        case 'GET': {
          site.get( route )
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
          };
          break;
      }
    });
  }

  get( route : routing.Route ) : Q.Promise< Embodiment > {
    var ctx = '['+this.name()+'.get] ';
    console.log(ctx+' route:'+ route.path);
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

  post( route : routing.Route, body: any ) : Q.Promise< Embodiment > {
    var ctx = '[site.post] ';
    if ( route.path.length > 1 ) {
      var direction = this.getDirection(route);
      if ( direction.resource ) {
        console.log(_.str.sprintf('%s "%s"',ctx,direction.resource.name() ));
        return direction.resource.post( direction.route, body );
      }
      else {
        return internals.promiseError( _.str.sprintf('%s ERROR Resource not found or invalid in request "%s"',ctx, route.pathname ), route.pathname );
      }
    }
    return internals.promiseError( _.str.sprintf('%s ERROR Invalid in request "%s"',ctx, route.pathname ), route.pathname );
  }
}

export class ResourceServer extends Container implements ResourcePlayer {
  private _name: string = '';
  private _template: string = '';
  private _layout: string;
  private _onGet : ( query: any ) => Q.Promise<any>;
  private _onPost : ( query: any, body: any ) => Q.Promise<any>;

  constructor( res : Resource ) {
    super();
    this._name = res.name;
    this._template = res.view;
    this._layout = res.layout;
    this._onGet = res.onGet ? Q.nbind(res.onGet,this) : undefined ;
    this._onPost = res.onPost ? Q.nbind(res.onPost,this) : undefined ;

    // Add children resources if available
    if ( res.resources ) {
      _.each( res.resources, ( child: Resource, index: number) => {
        this.add( child );
      });
    }
    // Merge the data into this object to easy access in the view.
    if ( res.data ) {
      _.each(res.data, ( value: any, attrname: string ) => {
        if ( attrname != 'resources') {
          this[attrname] = value;
        }
      } );
    }
  }

  name(): string { return this._name; }

  get(  route: routing.Route  ) : Q.Promise< Embodiment > {
    var ctx = _.str.sprintf('[get]');

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
      if ( this._onGet ) {
        var later = Q.defer< Embodiment >();
        console.log( _.str.sprintf('%s Calling onGet()!',ctx) );
        this._onGet( route.query )
          .then( ( data: any ) => {
            console.log( _.str.sprintf('%s Got data from callback: ',ctx, JSON.stringify(data) ) );
            var dyndata = data;
            if (dyndata) { // Merge the data into this object
              for (var attrname in dyndata) { this[attrname] = dyndata[attrname]; }
            }
            if ( this._template ) {
              console.log( _.str.sprintf('%s View "%s" as HTML using %s',ctx, this._name, this._template));
              internals.viewDynamic(this._template, this, this._layout )
                .then( (emb: Embodiment ) => {
                  later.resolve(emb);
                });
            }
            else {
              console.log( _.str.sprintf('%s View "%s" as JSON.',ctx, this._name ));
              internals.viewJson(this)
                .then( (emb: Embodiment ) => {
                  later.resolve(emb);
                });
            }
          });
        return later.promise;
      }
      else {
        console.log( _.str.sprintf('%s getting resource from the data ',ctx) );
        if ( this._template ) {
          console.log( _.str.sprintf('%s View "%s" as HTML using %s',ctx, this._name, this._template));
          return internals.viewDynamic(this._template, this, this._layout );
        }
        else {
          console.log( _.str.sprintf('%s View "%s" as JSON.',ctx, this._name ));
          return internals.viewJson(this);
        }
      }
    }
  }

  post( route: routing.Route, body: any  ) : Q.Promise< Embodiment > {
    var ctx = '[post] ';
    var laterAction = Q.defer< Embodiment >();
    var thisRes = this;

    if ( route.path.length > 1 ) {
      var direction = thisRes.getDirection( route );
      if ( direction.resource )
        return direction.resource.post( direction.route, body );
      else {
        return internals.promiseError( _.str.sprintf('%s ERROR Resource not found or invalid request "%s"',ctx, route.pathname ), route.pathname );
      }
    }
    else {
      if ( this._onPost ) {
        var later = Q.defer< Embodiment >();
        console.log( _.str.sprintf('%s Calling onPost()!',ctx) );
        this._onPost( route.query, body )
          .then( ( data: any ) => {
            var dyndata = data;
            console.log( _.str.sprintf('%s Post returned %s',ctx, JSON.stringify(dyndata)) );
            _.each( _.keys(dyndata), (key) => { thisRes[key] = dyndata[key] } );
            internals.viewJson(this)
              .then( (emb: Embodiment ) => {
                later.resolve(emb);
              });
          });
        return later.promise;
      }
      else {
        // What we do if there is no post function to receive the data ?
        // Should we just create a resource and set the data property?
      }
    }

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
  // setName( newName:string ) : void { this._name = newName; }

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
