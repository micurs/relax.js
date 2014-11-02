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
import fs = require("fs");
import url = require('url');
import path = require('path');
import Q = require('q');
import _ = require("underscore");
_.str = require('underscore.string');

import internals = require('./internals');
import routing = require('./routing');

exports.routing = routing;


export function relax() : void {
  console.log('relax.js !');
}

/*
 * Standard node Error: type declaration
*/
declare class Error {
    public name: string;
    public message: string;
    public stack: string;
    constructor(message?: string);
}


/*
 * Extended Error information for Relax.js
*/
interface IRxError extends Error {
  httpCode: number;
  extra: string;
  getHttpCode(): number;
  getExtra(): string;
}

/*
 * Extended Error class for Relax.js
*/
export class RxError implements IRxError {
  httpCode: number;
  extra: string;
  public name: string;
  public message: string;
  public stack: string;
  constructor( message: string, name?: string, code?: number, extra?: string ) {
    var tmp = new Error();
    this.message = message;
    this.name = name;
    this.httpCode = code;
    this.stack = tmp.stack;
    this.extra = extra;
  }
  getHttpCode(): number {
    return this.httpCode;
  }
  getExtra(): string {
    return this.extra ? this.extra : '' ;
  }

  toString(): string {
    return _.str.sprintf('RxError %d: %s\n%s\nStack:\n%s',this.httpCode,this.name,this.message,this.stack);
  }
}

/*
 * The resource player implement the resource runtime capabilities.
 * Derived classed manage the flow of requests coming from the site.
 * HttpPlayer defines all the HTTP verb functions.
*/
export interface HttpPlayer {
  name(): string;

  // Asks for the response identical to the one that would correspond to a GET request, but without the response body.
  head( route : routing.Route) : Q.Promise<Embodiment> ;

  // Requests a representation of the specified resource.
  get( route : routing.Route ) : Q.Promise<Embodiment> ;

  // Requests that the server accept the entity enclosed in the request as a new subordinate
  // of the web resource identified by the URI.
  post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;

  // Requests that the enclosed entity be stored under the supplied URI.
  // If the URI refers to an already existing resource, it is modified otherwise the resource can be created.
  put( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;

  // Deletes the specified resource.
  delete( route : routing.Route ) : Q.Promise<Embodiment> ;

  // Applies partial modifications to a resource.
  patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
}


/*
 * Response definition every resource generate an instance of ResourceResponse
 * by calling the DataCallback response function.
*/
export interface ResourceResponse {
  result: string;
  data?: any;
  httpCode?: number;
  location?: string;
}

/*
 * Type definition for the response callback function to use on the HTTP verb function
*/
export interface DataCallback {
  ( err: Error, resp?: ResourceResponse ): void;
}

/*
 * This is the definition for a resource as entered by the user of the library.
*/
export interface Resource {
  name: string;
  key?: string;
  view?: string;
  layout?: string;
  data?: any;
  resources?: Resource[];
  urlParameters?: string[];
  onHead?: ( query: any, callback: DataCallback ) => void;
  onGet?: ( query: any, callback: DataCallback ) => void;
  onPost?: ( query: any, body: any, callback: DataCallback) => void;
  onPut?: ( query: any, body: any, callback: DataCallback) => void;
  onDelete?: ( query: any, callback: DataCallback ) => void;
  onPatch?: ( query: any, body: any, callback: DataCallback) => void;
}

/*
 * A Resource map is a collection of Resource arrays.
 * Each arrray contain resource of the same type.
*/
export interface ResourceMap {
  [name: string]: HttpPlayer [];
}

/*
 * Every resource is converted to their embodiment before they can be served
*/
export class Embodiment {

  public httpCode : number;
  public location : string;
  public data : Buffer;
  public mimeType : string;

  constructor(  mimeType: string, data?: Buffer ) {
    this.httpCode = 200;
    this.data = data;
    this.mimeType = mimeType;
    //console.log( _.str.sprintf('[Embodiment] %s ', this.data.toString('utf-8') ) );
  }

  serve(response: http.ServerResponse) : void {
    var headers = { 'content-type' : this.mimeType };
    if ( this.data )
      headers['content-length'] = this.data.length;
    if ( this.location )
      headers['Location'] = this.location;

    response.writeHead( this.httpCode, headers );
    if ( this.data )
      response.write(this.data);
    response.end();

    if ( this.data.length>1024 )
      internals.log().info({ func: 'serve', class: 'Embodiment'}, 'Sending %s Kb', _.str.numberFormat(this.data.length/1024,1) ) ;
    else
      internals.log().info({ func: 'serve', class: 'Embodiment'}, 'Sending %s bytes', _.str.numberFormat(this.data.length) );
  }

  dataAsString() : string {
    return this.data.toString('utf-8');
  }
}

/*
 * A container of resources. This class offer helper functions to add and retrieve resources
 * child resources
*/
export class Container {
  public _resources:ResourceMap = {};
  private _parent: Container;

  constructor( parent?: Container ) {
    this._parent = parent;
  }

  get parent() : Container {
    return this._parent;
  }

  remove( child: HttpPlayer ) : boolean {
    var resArr = this._resources[child.name()];
    var idx = _.indexOf(resArr, child );
    if ( idx<0 )
      return false;
    resArr.splice(idx,1);
    return true;
  }

  // Find the first resource of the given type
  getFirstMatching( typeName: string ) : HttpPlayer {
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
    var resourcePlayer : ResourcePlayer = new ResourcePlayer(newRes,this);
    var indexName = _.str.slugify(newRes.name);
    var childArray = this._resources[indexName];
    if ( childArray === undefined )
      this._resources[indexName] = [ resourcePlayer ];
    else {
      childArray.push(resourcePlayer);
    }
    // console.log(_.str.sprintf('new resource: "%s" [%d] (%s)', newRes.name, this._resources[indexName].length-1, indexName ) );
  }

  getChild( name: string, idx: number = 0 ) : HttpPlayer {
    if ( this._resources[name])
      return this._resources[name][idx];
    else
      return undefined;
  }

  childTypeCount( typeName: string ) : number {
    if ( this._resources[typeName] )
      return this._resources[typeName].length;
    else
      return 0;
  }

  childCount() : number {
    var counter : number = 0;
    _.each< HttpPlayer[]>( this._resources, ( arrayItem : HttpPlayer[] ) => { counter += arrayItem.length; } );
    return counter;
  }

  getStepDirection( route : routing.Route ) : routing.Direction {
    var log = internals.log().child( { func: 'Container.getStepDirection'} );
    var direction: routing.Direction = new routing.Direction();
    log.info('Get the next step on %s', JSON.stringify(route.path) );
    direction.route = route.stepThrough(1);
    log.info('route', JSON.stringify(route.path) );
    var childResName = direction.route.getNextStep();
    if ( childResName in this._resources ) {
      //console.log(ctx+childResName+' found in _resources' );
      var idx:number = 0;
      if ( this._resources[childResName].length > 1 ) {
        // Since there are more than just ONE resource maching the name
        // Here we check if the next element in the path may be the index needed to
        // locate the right resource in the array.
        if ( direction.route.path[1] !== undefined ) {
          idx = parseInt(direction.route.path[1]) ;
          if ( isNaN(idx) ) {
            idx = 0;
          }
          else {
            direction.route = direction.route.stepThrough(1);
          }
        }
      }
      //console.log( _.str.sprintf('%s [%s] matching "%s" ',ctx, idx, childResName ) );
      log.info('Access Resource "%s"[%d] ', childResName, idx );
      direction.resource = this.getChild(childResName, idx);
    }
    return direction;
  }

}


/*
 * Root object for the application is the Site.
 * The site is in itself a Resource and is accessed via the root / in a url.
*/
export class Site extends Container implements HttpPlayer {
  private static _instance : Site = null;
  private _name: string = "site";
  private _version : string = '0.0.1';
  private _siteName : string = 'site';
  private _home : string = '/';
  private _pathCache = {};

  constructor( siteName:string, parent?: Container ) {
    super(parent);
    this._siteName = siteName;
    if(Site._instance){
      throw new Error('Error: Only one site is allowed.');
    }
    Site._instance = this;

    internals.initLog(siteName);

    if ( _.find( process.argv, (arg) => arg === '--relaxjs-verbose' ) ) {
      internals.setLogVerbose(true);
    }
  }

  public static $( name?:string ):Site {
    if(Site._instance === null ) {
      Site._instance = new Site( name ? name : 'site' );
    }
    return Site._instance;
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get version() : string {
    return this._version;
  }
  get siteName() : string {
    return this._siteName;
  }

  setPathCache( path: string, shortcut: { resource: ResourcePlayer; path: string[] } ) : void {
    this._pathCache[path] = shortcut;
  }

  serve() : http.Server {
    return http.createServer( (msg: http.ServerRequest , response : http.ServerResponse) => {
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromUrl(msg);
      var site : Site = this;
      var log = internals.log().child( { func: 'Site.serve'} );

      log.info('NEW REQUEST %s', msg.method);

      // Read the message body (if available)
      var body : string = '';
      msg.on('data', function (data) {
          body += data;
        });
      msg.on('end', function () {
        var promise: Q.Promise<Embodiment>;
        var bodyData = {};

        // Parse the data received with this request
        if ( body.length>0 )
          bodyData = internals.parseData(body,msg.headers['content-type']);

        if ( site[msg.method.toLowerCase()] === undefined ) {
          log.error('%s request is not supported ');
          return;
        }
        // Execute the HTTP request
        site[msg.method.toLowerCase()]( route, bodyData )
          .then( ( rep : Embodiment ) => {
            rep.serve(response);
          })
          .fail( function (error) {
            // console.log(error);
            var rxErr: RxError = <RxError>error;
            // console.log(rxErr.toString());
            if ( (<any>error).getHttpCode ) {
              response.writeHead( rxErr.getHttpCode(), {"content-type": "text/html"} );
              response.write('<h1>relax.js: we got an error</h1>');
            }
            else {
              response.writeHead( 500, {"content-type": "text/html"} );
              response.write('<h1>Error</h1>');
            }
            response.write('<h2>'+error.name+'</h2>');
            response.write('<h3 style="color:red;">'+_.escape(error.message)+'</h3><hr/>');
            response.write('<pre>'+error.stack+'</pre>');
            response.end();
          })
          .done();
      }); // End msg.on()
    }); // End http.createServer()
  }

  setHome( path: string ) : void {
    this._home = path;
  }

  private _getDirection( route: routing.Route, verb : string ) {
    var log = internals.log().child( { func: 'Site._getDirection'} );
    var cachedPath = this._pathCache[route.pathname];
    if ( cachedPath ) {
      var direction = new routing.Direction();
      direction.resource = cachedPath.resource;
      direction.route = route;
      direction.route.path = cachedPath.path;
      direction.verb = verb;
      log.info('%s Path Cache found for "%s"',verb, direction.resource.name() );
      return direction;
    }
    else {
      log.info('%s Step into %s ', verb, route.pathname );
      var direction = this.getStepDirection(route);
      if ( direction && direction.resource ) {
        direction.verb = verb;
        return direction;
      }
    }
    log.info('No Direction found', verb, route.pathname );
    return undefined;
  }


  head( route : routing.Route, body?: any  ) : Q.Promise< Embodiment > {
    var self = this;
    var log = internals.log().child( { func: 'Site.head'} );
    log.info('route: %s',route.pathname);
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'HEAD' );
      if ( !direction ) {
        return internals.promiseError( _.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname ), route.pathname );
      }
      log.info('HEAD resource "%s"',direction.resource.name() );
      route.path = direction.route.path;
      return direction.resource.head(route);
    }
    if ( self._home === '/') {
      return internals.viewDynamic(self.name(), this );
    }
    else {
      log.info('HEAD is redirecting to "%s"',self._home );
      return internals.redirect( self._home );
    }
  }


  get( route : routing.Route, body?: any  ) : Q.Promise< Embodiment > {
    var self = this;
    var log = internals.log().child( { func: 'Site.get'} );
    log.info('route: %s',route.pathname);
    if ( route.static ) {
      return internals.viewStatic( route.pathname );
    }
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'GET' );
      if ( direction === undefined ) {
        return internals.promiseError( _.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname ), route.pathname );
      }
      route.path = direction.route.path;
      return direction.resource.get(route);
    }
    if ( self._home === '/') {
      return internals.viewDynamic(self.name(), this );
    }
    else {
      log.info('GET is redirecting to "%s"',self._home );
      return internals.redirect( self._home );
    }
  }


  post( route : routing.Route, body?: any ) : Q.Promise< Embodiment > {
    var self = this;
    var log = internals.log().child( { func: 'Site.post'} );
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'POST' );
      if ( !direction )
        return internals.promiseError( _.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname ), route.pathname );
      log.info('POST on resource "%s"',direction.resource.name() );
      route.path = direction.route.path;
      return direction.resource.post( direction.route, body );
    }
    return internals.promiseError( _.str.sprintf('[error] Invalid in request "%s"', route.pathname ), route.pathname );
  }


  patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this;
    var log = internals.log().child( { func: 'Site.patch'} );
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'PATCH' );
      if ( !direction )
        return internals.promiseError( _.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname ), route.pathname );
      log.info('PATCH on resource "%s"',direction.resource.name() );
      route.path = direction.route.path;
      return direction.resource.patch( direction.route, body );
    }
    return internals.promiseError( _.str.sprintf('[error] Invalid in request "%s"', route.pathname ), route.pathname );
  }


  put( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var log = internals.log().child( { func: 'Site.put'} );
    var self = this;
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'PUT' );
      if ( !direction )
        return internals.promiseError( _.str.sprintf('[error] Resource not found or invalid in request "%s"', route.pathname ), route.pathname );
      log.info('PATCH on resource "%s"',direction.resource.name() );
      route.path = direction.route.path;
      return direction.resource.put( direction.route, body );
    }
    return internals.promiseError( _.str.sprintf('[error] Invalid PUT request "%s"', route.pathname ), route.pathname );
  }


  delete( route : routing.Route, body?: any  ) : Q.Promise<Embodiment> {
    var self = this;
    var ctx = '['+this.name()+'.delete] ';
    if ( route.static ) {
      return internals.promiseError( 'DELETE not supported on static resources', route.pathname );
    }

    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'DELETE' );
      if ( !direction )
        return internals.promiseError( _.str.sprintf('%s [error] Resource not found or invalid in request "%s"',ctx, route.pathname ), route.pathname );
      internals.log().info('%s "%s"',ctx,direction.resource.name() );
      route.path = direction.route.path;
      return direction.resource.delete( direction.route );
    }
    return internals.promiseError( _.str.sprintf('[error] Invalid DELETE request "%s"', route.pathname ), route.pathname );
  }
}

/*
 * ResourcePlayer absorbs a user defined resource and execute the HTTP requests.
 * The player dispatch requests to the childres resources or invoke user defined
 * response function for each verb.
*/
export class ResourcePlayer extends Container implements HttpPlayer {
  private _name: string = '';
  private _site: Site;
  private _template: string = '';
  private _layout: string;
  private _paramterNames: string[];
  private _onGet : ( query: any ) => Q.Promise<any>;
  private _onPost : ( query: any, body: any ) => Q.Promise<any>;
  private _onPatch : ( query: any, body: any ) => Q.Promise<any>;
  private _onDelete : ( query: any ) => Q.Promise<any>;
  private _parameters = {};

  public data = {};

  constructor( res : Resource, parent: Container ) {
    super(parent);
    var self = this;
    self._name = res.name;
    self._template = res.view;
    self._layout = res.layout;
    self._paramterNames = res.urlParameters ? res.urlParameters : [];
    self._parameters = {};
    self._onGet = res.onGet ? Q.nbind(res.onGet,this) : undefined ;
    self._onPost = res.onPost ? Q.nbind(res.onPost,this) : undefined ;
    self._onPatch = res.onPatch ? Q.nbind(res.onPatch,this) : undefined ;
    self._onDelete = res.onDelete ? Q.nbind(res.onDelete,this) : undefined ;

    // Add children resources if available
    if ( res.resources ) {
      _.each( res.resources, ( child: Resource, index: number) => {
        self.add( child );
      });
    }
    // Merge the data into this object to easy access in the view.
    self._updateData(res.data);
  }

  name(): string { return this._name; }

  ok( response: DataCallback, data?: any ) : void {
    var respObj = { result: 'ok'};
    if ( data )
      respObj['data'] = data;
    //console.log('RESPONDING:'+JSON.stringify(respObj,null,' '));
    response( null, respObj );
  }
  redirect( response: DataCallback, where: string, data?: any ) : void {
    var respObj = { result: 'ok', httpCode: 303, location: where };
    if ( data )
      respObj['data'] = data;
    // console.log(respObj);
    response( null, respObj );
  }
  fail( response: DataCallback, data?: any ) : void {
    var respObj = { result: 'fail'};
    if ( data )
      respObj['data'] = data;
    response( null, respObj );
  }

  // Read the parameters from a route
  private _readParameters( path: string[]) : number {
    var log = internals.log().child( { func: this._name+'._readParameters'} );
    var counter = 0;
    _.each(this._paramterNames, ( parameterName, idx, list) => {
      this._parameters[parameterName] = path[idx+1];
      counter++;
    });
    log.info(this._parameters);
    return counter;
  }

  // Reset the data property for this object and copy all the
  // elements from the given parameter into it.
  private _updateData( newData: any ) : void {
    this.data = {};
    _.each(newData, ( value: any, attrname: string ) => {
      if ( attrname != 'resources') {
        this.data[attrname] = value;
      }
    } );
  }



  // -------------------- HTTP VERB FUNCIONS -------------------------------------

  // Resource Player HEAD
  // Get the response as for a GET request, but without the response body.
  head( route : routing.Route) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    // var ctx = _.str.sprintf( _.str.sprintf('[%s.head]',self._name) );

    var later = Q.defer< Embodiment >();
    _.defer( () => { later.reject( new RxError('Not Implemented')) });
    return later.promise;
  }

  /*
   * HttpPlayer GET
   * This is the resource player GET:
   * it will call a GET to a child resource or the onGet() for the current resource.
  */
  get( route: routing.Route ) : Q.Promise< Embodiment > {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: self._name+'.get'} );
    var paramCount = self._paramterNames.length;

    // Dives in and navigates through the path to find the child resource that can answer this GET call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self.getStepDirection( route );
      if ( direction.resource ) {
        log.info('GET on resource "%s"',direction.resource.name() );
        return direction.resource.get( direction.route );
      }
      else {
        return internals.promiseError( _.str.sprintf('[error] ResourcePlayer GET could not find a Resource for "%s"', route.pathname ), route.pathname );
      }
    }

    log.info('GET Target Found : %s', self._name );

    // Read the parameters from the route
    if ( paramCount>0 )
      self._readParameters(route.path);

    // Set the cach to invoke this resource for this path directly next time
    site().setPathCache(route.pathname, { resource: this, path: route.path } );

    // This is the resource that need to answer either with a onGet or directly with data
    var dyndata: any = {};

    // If the onGet() is defined use id to get dynamic data from the user defined resource.
    if ( self._onGet ) {
      var later = Q.defer< Embodiment >();
      log.info('Invoking onGet()! on %s', self._name );

      self._onGet( route.query )
        .then( function( response: any ) {
          self._updateData(response.data);
          if ( self._template ) {
            internals.viewDynamic(self._template, self, self._layout )
              .then( (emb: Embodiment ) => { later.resolve(emb); })
              .fail( (err) => { later.reject(err) } );
          }
          else {
            internals.viewJson(self.data)
              .then( (emb: Embodiment ) => { later.resolve(emb); })
              .fail( (err) => { later.reject(err) } );
          }
        })
        .fail( function( rxErr: RxError ) {
          later.reject(rxErr);
        })
        .catch(function (error) {
          later.reject(error);
        });
      return later.promise;
    }

    // When onGet() is NOT available use the static data member to respond to this request.
    // console.log( _.str.sprintf('%s getting resource from the data ',ctx) );
    log.info('Returning static data from %s', self._name);
    if ( this._template ) {
      // console.log( _.str.sprintf('%s View "%s" as HTML using %s',ctx, self._name, self._template));
      return internals.viewDynamic(self._template, self, self._layout );
    }
    else {
      // console.log( _.str.sprintf('%s View "%s" as JSON.',ctx, self._name ));
      return internals.viewJson(self.data);
    }
  }


  // HttpPlayer DELETE
  // Deletes the specified resource (as identified in the URI).
  delete( route : routing.Route ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: self._name+'.delete'} );
    var paramCount = self._paramterNames.length;

    // console.log(ctx+paramCount)

    // Dives in and navigates through the path to find the child resource that can answer this DELETE call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = this.getStepDirection( route );
      if ( direction.resource ) {
        log.info('DELETE on resource "%s"',direction.resource.name() );
        return direction.resource.delete( direction.route );
      }
      else {
        return internals.promiseError( _.str.sprintf('[error] Resource not found "%s"', route.pathname ), route.pathname );
      }
    }

    // Read the parameters from the route
    if ( paramCount>0 )
      self._readParameters(route.path);

    // If the onDelete() is defined use id to get dynamic data from the user defined resource.
    if ( self._onDelete ) {
      log.info('calling onDelete() for %s',self._name );
      var later = Q.defer< Embodiment >();
      // console.log( _.str.sprintf('%s Calling onDelete()',ctx) );
      this._onDelete( route.query )
        .then( function( response: any ) {
          self._updateData(response.data);
          internals.viewJson(self)
            .then( (emb: Embodiment ) => {
              emb.httpCode = response.httpCode ? response.httpCode : 200 ;
              emb.location = response.location ? response.location : '';
              later.resolve(emb);
            })
            .fail( (err) => { later.reject(err)});
        })
        .fail( function( rxErr: RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // When onDelete() is NOT available need to remove this resource
    // console.log( _.str.sprintf('%s Removing static resource',ctx) );
    log.info('Removing static resource %s',self._name );
    self.parent.remove(self);
    return internals.viewJson(self);
  }

  // HttpPlayer POST
  // Asks the resource to create a new subordinate of the web resource identified by the URI.
  // The body sent to a post must contain the resource name to be created.
  post( route: routing.Route, body: any ) : Q.Promise< Embodiment > {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: self._name+'.post'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();

    // Dives in and navigates through the path to find the child resource that can answer this POST call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self.getStepDirection( route );
      if ( direction.resource ) {
        log.info('POST on resource "%s"',direction.resource.name() );
        return direction.resource.post( direction.route, body );
      }
      else {
        return internals.promiseError( _.str.sprintf('[error] Resource not found "%s"', route.pathname ), route.pathname );
      }
    }

    // Read the parameters from the route
    if ( paramCount>0 )
      self._readParameters(route.path);

    // Call the onPost() for this resource (user code)
    if ( self._onPost ) {
      log.info('calling onPost() for %s', self._name );
      self._onPost( route.query, body )
        .then( ( response: any ) => {
          self._updateData(response.data);
          internals.viewJson(self)
            .then( function(emb: Embodiment ) {
              emb.httpCode = response.httpCode ? response.httpCode : 200 ;
              emb.location = response.location ? response.location : '';
              later.resolve(emb);
            })
            .fail( function(err) {
              later.reject(err);
            });
        })
        .fail( function( rxErr: RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // Set the data directly
    log.info('Adding data for %s',self._name );
    self._updateData(body);
    internals.viewJson(self.data)
      .then( (emb: Embodiment ) => { later.resolve(emb); })
      .fail( (err) => { later.reject(err); } );

    return later.promise;
  }


  // HttpPlayer PATCH
  // Applies partial modifications to a resource (as identified in the URI).
  patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: self._name+'.patch'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();

    // Dives in and navigates through the path to find the child resource that can answer this POST call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self.getStepDirection( route );
      if ( direction.resource ) {
        log.info('PATCH on resource "%s"',direction.resource.name() );
        return direction.resource.patch( direction.route, body );
      }
      else {
        return internals.promiseError( _.str.sprintf('[error] Resource not found "%s"', route.pathname ), route.pathname );
      }
    }

    // Read the parameters from the route
    if ( paramCount>0 )
      self._readParameters(route.path);

    if ( self._onPatch ) {
      log.info('calling onPatch() for %s',self._name );
      self._onPatch( route.query, body )
        .then( ( response: any ) => {
          // console.log( _.str.sprintf('%s View "%s" as JSON.',ctx, self._name ));
          self._updateData(response.data);
          internals.viewJson(self)
            .then( function(emb: Embodiment ) {
              emb.httpCode = response.httpCode ? response.httpCode : 200 ;
              emb.location = response.location ? response.location : '';
              // console.log( _.str.sprintf('%s Embodiment Ready to Resolve %s', ctx, emb.dataAsString() ) );
              later.resolve(emb);
            })
            .fail( function(err) { later.reject(err); } );
        })
        .fail( function( rxErr: RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // Set the data directly
    log.info('Updating data for %s',self._name );
    self._updateData(body);
    internals.viewJson(self.data)
      .then( (emb: Embodiment ) => { later.resolve(emb); })
      .fail( (err) => { later.reject(err); } );
    return later.promise;
  }


  // HttpPlayer PUT
  // Asks that the enclosed entity be stored under the supplied URI.
  // The body sent to a post does not contain the resource name to be stored since that name is the URI.
  put( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: self._name+'.patch'} );

    var later = Q.defer< Embodiment >();
    _.defer( () => { later.reject( new RxError('Not Implemented')) });
    return later.promise;
  }

}

export function site( name?: string ) : Site {
  return Site.$(name);
}
