/*
 * Relax.js version 0.1.2
 * by Michele Ursino Nov - 2014
*/

///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/lodash/lodash.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='../typings/xml2js/xml2js.d.ts' />

import http = require("http");
import fs = require("fs");
import url = require('url');
import path = require('path');
import Q = require('q');
import _ = require("lodash");
import xml2js = require('xml2js');

import internals = require('./internals');
import routing = require('./routing');
import rxError = require('./rxerror');

var package = require(__dirname+'/../package.json');

exports.routing = routing;
exports.rxError = rxError;

export var version = package.version;

export function relax() : void {
  console.log('relax.js !');
}


/*
 * The resource player implement the resource runtime capabilities.
 * Derived classed manage the flow of requests coming from the site.
 * HttpPlayer defines all the HTTP verb functions.
*/
export interface HttpPlayer {
  name : string;
  urlName: string;


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
  cookiesData?: string[];
}


/*
 * Type definition for the response callback function to use on the HTTP verb function
*/
export interface DataCallback {
  ( err: Error, resp?: ResourceResponse ): void;
}

/*
 * A filter function is called on every request and can stop the dispatch of the request to the
 * target resource. The call is asyncronous. When complete it must call the resultCall passed
 * as third argument.
 * Note: the filter is called by the Site before evenb attempting to route the request to a
 * resource.
 */
export interface RequestFilter {
  ( route : routing.Route, body: any, result : DataCallback ) : void ;
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
  outFormat?: string;
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
  [name: string]: Container [];
}


/*
 * Every resource is converted to their embodiment before they can be served
*/
export class Embodiment {

  public httpCode : number;
  public location : string;
  public mimeType : string;
  public body : Buffer;
  public cookiesData: string[] = []; // example a cookie valie would be ["type=ninja", "language=javascript"]

  constructor(  mimeType: string, code: number = 200, body?: Buffer ) {
    this.httpCode = code;
    this.body = body;
    this.mimeType = mimeType;
  }

  // Add a serialized cookie to be returned as a set  cookie in a response.
  addSetCookie( cookie: string ) {
    this.cookiesData.push(cookie);
  }

  serve(response: http.ServerResponse) : void {
    var log = internals.log().child( { func: 'Embodiment.serve'} );
    var headers = { 'content-type' : this.mimeType };
    if ( this.body )
      headers['content-length'] = this.body.length;
    if ( this.location )
      headers['Location'] = this.location;

    // Add the cookies set to the header
    _.each( this.cookiesData, (cookie) => response.setHeader('Set-Cookie', cookie ) );

    response.writeHead( this.httpCode, headers );
    if ( this.body ) {
      response.write(this.body);
      if ( this.body.length>1024 )
        log.info( 'Sending %s Kb (as %s)', Math.round(this.body.length/1024), this.mimeType ) ;
      else
        log.info( 'Sending %s bytes (as %s)', this.body.length,this.mimeType );
    }
    response.end();
  }

  bodyAsString() : string {
    return this.body.toString('utf-8');
  }
  bodyAsJason() : any {
    return JSON.parse(this.bodyAsString());
  }
}


/*
 * A container of resources. This class offer helper functions to add and retrieve resources
 * child resources
*/
export class Container {
  protected _name: string = '';
  private _parent: Container;

  protected _cookiesData : string[] = [];   // Outgoing cookies to be set
  protected _cookies: string[] = [];        // Received cookies unparsed

  public _resources:ResourceMap = {};

  constructor( parent?: Container ) {
    this._parent = parent;
  }

  get parent() : Container {
    return this._parent;
  }
  get name(): string {
    return this._name;
  }
  get urlName() : string {
    return internals.slugify(this.name);
  }

  setName( newName:string ) : void {
    this._name = newName;
  }

  setCookie( cookie: string ) {
    this._cookiesData.push(cookie);
  }
  getCookies( ) : string[] {
    return this._cookies;
  }

  // Helper function to call the response callback with a succesful code 'ok'
  ok( response: DataCallback, data?: any ) : void {
    var respObj : ResourceResponse = { result: 'ok', httpCode: 200, cookiesData: this._cookiesData };
    if ( data )
      respObj['data'] = data;
    response( null, respObj );
  }

  // Helper function to call the response callback with a redirect code 303
  redirect( response: DataCallback, where: string, data?: any ) : void {
    var respObj : ResourceResponse = { result: 'ok', httpCode: 303, location: where, cookiesData: this._cookiesData  };
    if ( data )
      respObj['data'] = data;
    response( null, respObj );
  }

  // Helper function to call the response callback with a fail error
  fail( response: DataCallback, err: rxError.RxError ) : void {
    var log = internals.log().child( { func: this._name+'.fail'} );
    log.info('Call failed: %s', err.message );
    response( err, null );
  }

  /*
   * Remove a child resource from this container
  */
  remove( child: ResourcePlayer ) : boolean {
    var log = internals.log().child( { func: 'Container.remove'} );
    var resArr = this._resources[child.name];
    if ( !resArr )
      return false;
    var idx = _.indexOf(resArr, child );
    if ( idx<0 )
      return false;
    resArr.splice(idx,1);
    log.info('- %s',child.name);
    return true;
  }

  /*
   * Inspect the cuurent path in the given route and create the direction
   * to pass a http request to a child resource.
   * If the route.path is terminal this function finds the immediate target resource
   * and assign it to the direction.resource.
   * This function manages also the interpretaiton of an index in the path immediately
   * after the resource name.
  */
  protected _getStepDirection( route : routing.Route ) : routing.Direction {
    var log = internals.log().child( { func: 'Container.getStepDirection'} );
    var direction: routing.Direction = new routing.Direction();
    log.info('Get the next step on %s', JSON.stringify(route.path) );
    direction.route = route.stepThrough(1);
    var childResName = direction.route.getNextStep();

    if ( childResName in this._resources ) {
      var idx:number = 0;
      if ( this._resources[childResName].length > 1 ) {
        // Since there are more than just ONE resource maching the name
        // we check the next element in the path for the index needed to
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
      log.info('Access Resource "%s"[%d] ', childResName, idx );
      direction.resource = this.getChild(childResName, idx);
    }

    return direction;
  }


  /*
   * Returns the direction toward the resource in the given route.
   * The Direction object returned may point directly to the resource requested or
   * may point to a resource that will lead to the requested resource
  */
  protected _getDirection( route: routing.Route, verb : string = 'GET' ) : routing.Direction {
    var log = internals.log().child( { func: 'Container._getDirection'} );

    log.info('%s Step into %s ', verb, route.pathname );
    var direction = this._getStepDirection(route);
    if ( direction && direction.resource ) {
      direction.verb = verb;
      return direction;
    }
    log.info('No Direction found', verb, route.pathname );
    return undefined;
  }


  /*
   * Return the resource matching the given path.
  */
  getResource( pathname: string ) : Container {
    var route = new routing.Route(pathname);
    var direction = this._getDirection(route); // This one may return the resource directly if cached
    if ( !direction )
      return undefined;
    var resource : Container = direction.resource;
    route.path = direction.route.path;
    while( route.path.length > 1 ) {
      direction = resource._getStepDirection(route);
      if ( direction ) {
        resource = direction.resource;
        route.path = direction.route.path;
      }
      else {
        return undefined;
      }
    }
    return resource;
  }


  // Add a resource of the given type as child
  add( newRes: Resource ) : void {
    var log = internals.log().child( { func: 'Container.add'} );
    newRes['_version'] = site().version;
    newRes['siteName'] = site().siteName;
    var resourcePlayer : ResourcePlayer = new ResourcePlayer(newRes,this);

    // Add the resource player to the child resource container for this container.
    var indexName = internals.slugify(newRes.name);
    var childArray = this._resources[indexName];
    if ( childArray === undefined )
      this._resources[indexName] = [ resourcePlayer ];
    else {
      childArray.push(resourcePlayer);
    }
    log.info('+ %s',indexName);
  }


  // Find the first resource of the given type
  getFirstMatching( typeName: string ) : Container {
    var childArray = this._resources[typeName];
    if ( childArray === undefined ) {
      return null;
    }
    return childArray[0];
  }


  getChild( name: string, idx: number = 0 ) : Container {
    if ( this._resources[name] && this._resources[name].length > idx )
      return this._resources[name][idx];
    else
      return undefined;
  }


  /*
   * Return the number of children resources of the given type.
  */
  childTypeCount( typeName: string ) : number {
    if ( this._resources[typeName] )
      return this._resources[typeName].length;
    else
      return 0;
  }


  /*
   * Return the total number of children resources for this node.
  */
  childrenCount() : number {
    var counter : number = 0;
    _.each< Container[]>( this._resources, ( arrayItem : Container[] ) => { counter += arrayItem.length; } );
    return counter;
  }

}


/*
 * Root object for the application is the Site.
 * The site is in itself a Resource and is accessed via the root / in a url.
*/
export class Site extends Container implements HttpPlayer {

  private static _instance : Site = null;
  // private _name: string = "site";
  private _version : string = version;
  private _siteName : string = 'site';
  private _home : string = '/';
  private _pathCache = {};

  private _filters: RequestFilter[] = [];
  public enableFilters: boolean = false;

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
    if(Site._instance === null || name ) {
      Site._instance = null;
      Site._instance = new Site( name ? name : 'site' );
    }
    return Site._instance;
  }

  /*
   * Returns the direction toward the resource in the given route.
   * The Direction object returned may point directly to the resource requested or
   * may point to a resource that will lead to the requested resource
  */
  protected _getDirection( route: routing.Route, verb : string = 'GET' ) : routing.Direction {
    var log = internals.log().child( { func: 'Site._getDirection'} );
    var cachedPath = this._pathCache[route.pathname];
    if ( cachedPath ) {
      var direction = new routing.Direction();
      direction.resource = cachedPath.resource;
      direction.route = route;
      direction.route.path = cachedPath.path;
      direction.verb = verb;
      log.info('%s Path Cache found for "%s"',verb, route.pathname );
      return direction;
    }
    else {
      log.info('%s Step into %s ', verb, route.pathname );
      var direction = this._getStepDirection(route);
      if ( direction && direction.resource ) {
        direction.verb = verb;
        return direction;
      }
    }
    log.info('No Direction found', verb, route.pathname );
    return undefined;
  }

  get version() : string {
    return this._version;
  }

  get siteName() : string {
    return this._siteName;
  }

  setPathCache( path: string, shortcut: { resource: ResourcePlayer; path: string[] } ) : void {
    this._pathCache[path] = shortcut;
  }

  // Output to response the given error following the mime type in format.
  private _outputError( response : http.ServerResponse, error:rxError.RxError, format: string ) {
    var mimeType = format.split(/[\s,]+/)[0];
    var errCode = error.getHttpCode ? error.getHttpCode() : 500;
    response.writeHead( errCode, { 'content-type': mimeType } );
    var errObj = {
      version: version ,
      result: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack.split('\n')
      }
    };

    switch( mimeType ) {
      case 'text/html':
        response.write('<h1>relax.js: We Got Errors</h1>');
        response.write('<h2>'+error.name+'</h2>');
        response.write('<h3 style="color:red;">'+_.escape(error.message)+'</h3><hr/>');
        response.write('<pre>'+_.escape(error.stack)+'</pre>');
      break;
      case 'application/xml':
      case 'text/xml':
        var builder = new xml2js.Builder({ rootName: 'relaxjs' });
        response.write( builder.buildObject(errObj) );
      break;
      case 'application/json':
      default:
        response.write( JSON.stringify(errObj) );
      break;
    }
    response.end();
  }

  /*
   * Set a user callback function to be executed on every request.
   */
  addRequestFilter( filterFunction: RequestFilter ) : void {
    this._filters.push(filterFunction);
  }

  deleteRequestFilter( filterFunction?: RequestFilter ) : boolean {
    return ( _.remove( this._filters, (f) => f === filterFunction ) != undefined );
  }

  deleteAllRequestFilters() : boolean {
    this._filters = [];
    return true;
  }

  /*
   * Execute the filters.
  */
  private _checkFilters( route : routing.Route, body: any, response : http.ServerResponse) : Q.Promise< boolean > {
    var self = this;
    var later = Q.defer< boolean> ()
    if ( !self.enableFilters || self._filters.length == 0 ) {
      later.resolve(true);
      return later.promise;
    }

    var filtersCalls = _.map( self._filters, (f) => Q.nfcall( f.bind(self,route,body) ) );

    // Filter the request: execute all the filters regarding if the fail or not
    Q.all( filtersCalls )
      .then( ( replies : ResourceResponse[] ) => {
        // If any filter filled the reply with some data we need to return that instead of leaving the
        // request to the destination resource.
        var filterResponse = _.find( replies, (r: ResourceResponse) => r.httpCode != 200 || r.data !== undefined );

        if ( !filterResponse ) {
          later.resolve(true);
          return;
        }
        // One filter had a response. This is what we deliver!
        internals.createEmbodiment( filterResponse.data, 'application/json' )
          .then( ( reply: Embodiment ) => {
            reply.httpCode = filterResponse.httpCode ? filterResponse.httpCode : 200;
            reply.location = filterResponse.location;
            reply.cookiesData = filterResponse.cookiesData;
            reply.serve(response);
            later.resolve(false);
          })
        })
      .fail( ( err : rxError.RxError ) => {
        later.reject( err );
        });

    return later.promise;
  }

  /*
   * Create a Server for the site and manage all the requests by routing them to the appropriate resource
  */
  serve() : http.Server {
    var self = this;
    return http.createServer( (msg: http.ServerRequest , response : http.ServerResponse) => {
      // here we need to route the call to the appropriate class:
      var route : routing.Route = routing.fromRequestResponse(msg,response);
      var site : Site = this;
      var log = internals.log().child( { func: 'Site.serve'} );

      this._cookies = route.cookies;  // The client code can retrieved the cookies using this.getCookies();

      log.info('   REQUEST: %s', route.verb );
      log.info('      PATH: %s %s', route.pathname, route.query);
      log.info('Out FORMAT: %s', route.outFormat);
      log.info(' In FORMAT: %s', route.inFormat);

      // Read the message body (if available)
      var body : string = '';
      msg.on('data', function (data) {
          body += data;
        });
      msg.on('end', function () {
        var promise: Q.Promise<Embodiment>;
        if ( site[msg.method.toLowerCase()] === undefined ) {
          log.error('%s request is not supported ');
          return;
        }

        // Parse the data received with this request
        internals.parseData(body,route.inFormat)
          .then( ( bodyData: any ) => {

            self._checkFilters(route,body,response)
              .then( ( allFilteresPass: boolean ) => {
                if ( allFilteresPass ) {
                  // Execute the HTTP request
                  site[msg.method.toLowerCase()]( route, bodyData )
                    .then( ( reply : Embodiment ) => {
                      log.info('HTTP %s request fulfilled',msg.method  );
                      reply.serve(response);
                    })
                    .fail( (error) => {
                      log.error('HTTP %s request failed: %s:',msg.method,error.message);
                      self._outputError(response,error,route.outFormat);
                    })
                    .done();
                }
              })
              .fail( (err: rxError.RxError ) => {
                self._outputError(response, err , route.outFormat );
                });
            })
          .fail( (error) => {
            log.error('HTTP %s request body could not be parsed: %s:',msg.method,error.message);
            self._outputError(response,error,route.outFormat);
            });
      }); // End msg.on()
    }); // End http.createServer()
  }

  setHome( path: string ) : void {
    this._home = path;
  }




  // HTTP Verb functions --------------------

  head( route : routing.Route, body?: any  ) : Q.Promise< Embodiment > {
    var self = this;
    var log = internals.log().child( { func: 'Site.head'} );
    log.info('route: %s',route.pathname);
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'HEAD' );
      if ( !direction ) {
        return internals.promiseError( internals.format('[error] Resource not found or invalid in request "{0}"',route.pathname) , route.pathname );
      }
      route.path = direction.route.path;
      var res = <ResourcePlayer>(direction.resource);
      return res.head(route);
    }
    if ( self._home === '/') {
      return internals.viewDynamic(self.name, this );
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
    //log.info(' FORMAT: %s', route.outFormat);

    if ( route.static ) {
      return internals.viewStatic( route.pathname );
    }
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'GET' );
      if ( direction === undefined ) {
        return internals.promiseError(  internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname), route.pathname );
      }
      route.path = direction.route.path;
      var res = <ResourcePlayer>(direction.resource);
      return res.get(route);
    }
    if ( route.path[0] === 'site' && self._home === '/') {
      return internals.viewDynamic(self.name, this );
    }
    if ( self._home !== '/' ) {
      log.info('GET is redirecting to "%s"',self._home );
      return internals.redirect( self._home );
    }

    return internals.promiseError( internals.format('[error] Root Resource not found or invalid in request "{0}"', route.pathname ), route.pathname );
  }


  post( route : routing.Route, body?: any ) : Q.Promise< Embodiment > {
    var self = this;
    var log = internals.log().child( { func: 'Site.post'} );
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'POST' );
      if ( !direction )
        return internals.promiseError( internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname ), route.pathname );
      var res = <ResourcePlayer>(direction.resource);
      log.info('POST on resource "%s"',res.name );
      route.path = direction.route.path;
      return res.post( direction.route, body );
    }
    return internals.promiseError(  internals.format('[error] Invalid in request "{0}"', route.pathname ), route.pathname );
  }


  patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this;
    var log = internals.log().child( { func: 'Site.patch'} );
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'PATCH' );
      if ( !direction )
        return internals.promiseError( internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname ), route.pathname );
      var res = <ResourcePlayer>(direction.resource);
      log.info('PATCH on resource "%s"',res.name );
      route.path = direction.route.path;
      return res.patch( direction.route, body );
    }
    return internals.promiseError(  internals.format('[error] Invalid in request "{0}"', route.pathname ), route.pathname );
  }


  put( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var log = internals.log().child( { func: 'Site.put'} );
    var self = this;
    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'PUT' );
      if ( !direction )
        return internals.promiseError( internals.format('[error] Resource not found or invalid in request "{0}"', route.pathname ), route.pathname );
      var res = <ResourcePlayer>(direction.resource);
      log.info('PUT on resource "%s"',res.name );
      route.path = direction.route.path;
      return res.put( direction.route, body );
    }
    return internals.promiseError( internals.format('[error] Invalid PUT request "{0}"', route.pathname ), route.pathname );
  }


  delete( route : routing.Route, body?: any  ) : Q.Promise<Embodiment> {
    var self = this;
    var ctx = '['+this.name+'.delete] ';
    if ( route.static ) {
      return internals.promiseError( 'DELETE not supported on static resources', route.pathname );
    }

    if ( route.path.length > 1 ) {
      var direction = self._getDirection( route, 'DELETE' );
      if ( !direction )
        return internals.promiseError( internals.format('{0} [error] Resource not found or invalid in request "{1}"', ctx, route.pathname ), route.pathname );
      var res = <ResourcePlayer>(direction.resource);
      internals.log().info('%s "%s"',ctx,res.name );
      route.path = direction.route.path;
      return res.delete( direction.route );
    }
    return internals.promiseError( internals.format('[error] Invalid DELETE request "{0}"', route.pathname ), route.pathname );
  }

}


/*
 * ResourcePlayer absorbs a user defined resource and execute the HTTP requests.
 * The player dispatch requests to the childres resources or invoke user defined
 * response function for each verb.
*/
export class ResourcePlayer extends Container implements HttpPlayer {

  static version = version;
  private _site: Site;
  private _template: string = '';
  private _layout: string;
  private _paramterNames: string[];
  private _outFormat: string;
  private _onGet : ( query: any ) => Q.Promise<any>;
  private _onPost : ( query: any, body: any ) => Q.Promise<any>;
  private _onPatch : ( query: any, body: any ) => Q.Promise<any>;
  private _onDelete : ( query: any ) => Q.Promise<any>;
  private _onPut : ( query: any, body: any ) => Q.Promise<any>;
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
    self._outFormat = res.outFormat;
    self._onGet = res.onGet ? Q.nbind(res.onGet,this) : undefined ;
    self._onPost = res.onPost ? Q.nbind(res.onPost,this) : undefined ;
    self._onPatch = res.onPatch ? Q.nbind(res.onPatch,this) : undefined ;
    self._onDelete = res.onDelete ? Q.nbind(res.onDelete,this) : undefined ;
    self._onPut = res.onPut ? Q.nbind(res.onPut,this) : undefined ;

    // Add children resources if available
    if ( res.resources ) {
      _.each( res.resources, ( child: Resource, index: number) => {
        self.add( child );
      });
    }
    // Merge the data into this object to easy access in the view.
    self._updateData(res.data);
  }

  setOutputFormat( fmt: string ) {
    this._outFormat = fmt;
  }


  /*
   * Reads the parameters from a route and store them in the this._parmaters member.
   * Return the number of paramters correcly parsed.
  */
  private _readParameters( path: string[], generateError: boolean = true ) : number {
    var log = internals.log().child( { func: this._name+'._readParameters'} );
    var counter = 0;
    _.each(this._paramterNames, ( parameterName, idx, list) => {
      if ( !path[idx+1] ) {
        if ( generateError ) {
          log.error('Could not read all the required paramters from URI. Read %d, needed %d',counter,this._paramterNames.length);
        }
        return counter; // breaks out of the each loop.
      }
      this._parameters[parameterName] = path[idx+1];
      counter++;
    });
    log.info('Read %d parameters from request URL: %s', counter, JSON.stringify(this._parameters) );
    return counter;
  }


  /*
   * Reset the data property for this object and copy all the
   * elements from the given parameter into it.
   */
  private _updateData( newData: any ) : void {
    var self = this;
    self.data = {};
    _.each(newData, ( value: any, attrname: string ) => {
      if ( attrname != 'resources') {
        self.data[attrname] = value;
      }
    } );
  }


  /*
   * Delivers a reply as Embodiment of the given response through the given promise and
   * in the given outFormat
  */
  private _deliverReply( later: Q.Deferred<Embodiment>,
                         resResponse: ResourceResponse,
                         outFormat: string,
                         deliverAnyFormat: boolean = false ) : void {
    var self = this;
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+')._deliverReply'} );
    var mimeTypes = outFormat ? outFormat.split(/[\s,;]+/) : ['application/json'];
    log.info('Formats: %s', JSON.stringify(mimeTypes));

    // Use the template for GET html requests
    if ( self._template &&
        ( mimeTypes.indexOf('text/html')!=-1 || mimeTypes.indexOf('*/*')!=-1 ) ) {
      // Here we copy the data into the resource itself and process it through the viewing engine.
      // This allow the code in the view to act in the context of the resourcePlayer.
      self.data = resResponse.data;
      internals.viewDynamic(self._template, self, self._layout )
        .then( ( reply: Embodiment ) => {
          reply.httpCode = resResponse.httpCode ? resResponse.httpCode : 200;
          reply.location = resResponse.location;
          reply.cookiesData = resResponse.cookiesData;
          later.resolve(reply);
        })
        .fail( (err) => {
          later.reject(err)
        });
    }
    else {
      var mimeType = undefined;
      // This is orrible, it should be improved in version 0.1.3
      if ( mimeTypes.indexOf('*/*')!=-1 ) { mimeType = 'application/json'; }
      if ( mimeTypes.indexOf('application/json')!=-1 ) { mimeType = 'application/json'; }
      if ( mimeTypes.indexOf('application/xml')!=-1 ) { mimeType = 'application/xml'; }
      if ( mimeTypes.indexOf('text/xml')!=-1 ) { mimeType = 'text/xml'; }
      if ( mimeTypes.indexOf('application/xhtml+xml')!=-1) { mimeType= 'application/xml'; }
      if ( mimeTypes.indexOf('application/x-www-form-urlencoded')!=-1) { mimeType= 'text/xml'; }
      if ( mimeType ) {
        internals.createEmbodiment(resResponse.data, mimeType )
          .then( ( reply: Embodiment ) => {
            reply.httpCode = resResponse.httpCode ? resResponse.httpCode : 200;
            reply.location = resResponse.location;
            reply.cookiesData = resResponse.cookiesData;
            later.resolve(reply);
          })
          .fail( (err) => {
            later.reject(err)
          });
      }
      else {
        if ( deliverAnyFormat ) {
          later.resolve( new Embodiment( outFormat, 200, resResponse.data ) );
        }
        else {
          later.reject(new rxError.RxError( 'output as ('+outFormat+') is not available for this resource','Unsupported Media Type',415) ); // 415 Unsupported Media Type
        }
      }
    }
  }


  // -------------------- HTTP VERB FUNCIONS -------------------------------------


  /*
   * Resource Player HEAD
   * Get the response as for a GET request, but without the response body.
  */
  head( route : routing.Route) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var later = Q.defer< Embodiment >();
    _.defer( () => { later.reject( new rxError.RxError('Not Implemented')) });
    return later.promise;
  }


  /*
   * HttpPlayer GET
   * This is the resource player GET:
   * it will call a GET to a child resource or the onGet() for the current resource.
  */
  get( route: routing.Route ) : Q.Promise< Embodiment > {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+').get'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();

    // Dives in and navigates through the path to find the child resource that can answer this GET call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self._getStepDirection( route );
      if ( direction.resource ) {
        var res = <ResourcePlayer>(direction.resource);
        log.info('GET on resource "%s"',res.name );
        return res.get( direction.route );
      }
      else {
        if ( _.keys(self._resources).length === 0 )
          return internals.promiseError( internals.format('[error: no child] This resource "{0}" does not have any child resource to navigate to. Path= "{1}"', self.name, JSON.stringify(route.path) ), route.pathname );
        else
          return internals.promiseError( internals.format('[error: no such child] ResourcePlayer GET could not find a Resource for "{0}"',  JSON.stringify(route.path) ), route.pathname );
      }
    }

    // 2 - Read the parameters from the route
    log.info('GET Target Found : %s (requires %d parameters)', self._name, paramCount );
    if ( paramCount>0 ) {
      if ( self._readParameters(route.path)<paramCount ) {
        later.reject( new rxError.RxError('Not enough paramters available in the URI ','GET '+self.name, 404));
        return later.promise;
      }
    }

    // Set the cach to invoke this resource for this path directly next time
    site().setPathCache(route.pathname, { resource: this, path: route.path } );

    // This is the resource that need to answer either with a onGet or directly with data
    var dyndata: any = {};

    // If the onGet() is defined use id to get dynamic data from the user defined resource.
    if ( self._onGet ) {
      log.info('Invoking onGet()! on %s (%s)', self._name, route.outFormat );
      this._cookies = route.cookies;  // The client code can retrieved the cookies using this.getCookies();
      self._onGet( route.query )
        .then( function( response: ResourceResponse ) {
          self._updateData(response.data);
          self._deliverReply(later, response, self._outFormat ? self._outFormat: route.outFormat, self._outFormat!==undefined );
        })
        .fail( function( rxErr: rxError.RxError ) {
          later.reject(rxErr);
        })
        .catch(function (error) {
          later.reject(error);
        });
      return later.promise;
    }

    // 4 - Perform the default GET that is: deliver the data associated with this resource
    log.info('Returning static data from %s', self._name);
    var responseObj : ResourceResponse = { result: 'ok', httpCode: 200, data: self.data };
    self._deliverReply(later, responseObj, self._outFormat ? self._outFormat: route.outFormat );
    return later.promise;
  }


  /*
   * HttpPlayer DELETE
   * Deletes the specified resource (as identified in the URI within the route).
  */
  delete( route : routing.Route ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+').delete'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();


    // 1 - Dives in and navigates through the path to find the child resource that can answer this DELETE call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self._getStepDirection( route );
      if ( direction ) {
        var res = <ResourcePlayer>(direction.resource);
        log.info('DELETE on resource "%s"',res.name );
        return res.delete( direction.route );
      }
      else {
        return internals.promiseError( internals.format('[error] Resource not found "{0}"', route.pathname ), route.pathname );
      }
    }

    // 2 - Read the parameters from the route
    log.info('DELETE Target Found : %s (requires %d parameters)', self._name, paramCount );
    if ( paramCount>0 ) {
      if ( self._readParameters(route.path)<paramCount ) {
        later.reject( new rxError.RxError('Not enough paramters available in the URI ','DELETE '+self.name, 404));
        return later.promise;
      }
    }

    // If the onDelete() is defined use it to invoke a user define delete.
    if ( self._onDelete ) {
      log.info('call onDelete() for %s',self._name );
      this._cookies = route.cookies;  // The client code can retrieved the cookies using this.getCookies();
      this._onDelete( route.query )
        .then( function( response: ResourceResponse ) {
          self._updateData(response.data);
          self._deliverReply(later, response, self._outFormat ? self._outFormat: route.outFormat  );
        })
        .fail( function( rxErr: rxError.RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // 4 - Perform the default DELETE that is: delete this resource
    log.info('Default Delete: Removing resource %s',self._name );
    self.parent.remove(self);
    self.parent = null;
    var responseObj : ResourceResponse = { result: 'ok', httpCode: 200, data: self.data };
    self._deliverReply(later, responseObj, self._outFormat ? self._outFormat: route.outFormat  );
    return later.promise;
  }


  /*
   * HttpPlayer POST
   * Asks the resource to create a new subordinate of the web resource identified by the URI.
   * The body sent to a post must contain the resource name to be created.
  */
  post( route: routing.Route, body: any ) : Q.Promise< Embodiment > {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+').post'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();

    // Dives in and navigates through the path to find the child resource that can answer this POST call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self._getStepDirection( route );
      if ( direction ) {
        var res = <ResourcePlayer>(direction.resource);
        log.info('POST on resource "%s"',res.name );
        return res.post( direction.route, body );
      }
      else {
        return internals.promiseError( internals.format('[error] Resource not found "{0}"', route.pathname ), route.pathname );
      }
    }

    // 2 - Read the parameters from the route
    log.info('POST Target Found : %s (requires %d parameters)', self._name, paramCount );
    if ( paramCount>0 ) {
      // In a POST not finding all the paramters expeceted should not fail the call.
      self._readParameters(route.path,false);
    }

    // Call the onPost() for this resource (user code)
    if ( self._onPost ) {
      log.info('calling onPost() for %s', self._name );
      this._cookies = route.cookies;  // The client code can retrieved the cookies using this.getCookies();
      self._onPost( route.query, body )
        .then( ( response: ResourceResponse ) => {
          self._deliverReply(later, response, self._outFormat ? self._outFormat: route.outFormat  );
        })
        .fail( function( rxErr: rxError.RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // 4 - Perform the default POST that is: set the data directly
    log.info('Adding data for %s',self._name );
    self._updateData(body);
    var responseObj : ResourceResponse = { result: 'ok', httpCode: 200, data: self.data };
    self._deliverReply(later, responseObj, self._outFormat ? self._outFormat: route.outFormat );
    return later.promise;
  }


  /*
   * HttpPlayer PATCH
   * Applies partial modifications to a resource (as identified in the URI).
  */
  patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+').patch'} );
    var paramCount = self._paramterNames.length;
    var later = Q.defer< Embodiment >();

    // 1 - Dives in and navigates through the path to find the child resource that can answer this POST call
    if ( route.path.length > ( 1+paramCount ) ) {
      var direction = self._getStepDirection( route );
      if ( direction ) {
        var res = <ResourcePlayer>(direction.resource);
        log.info('PATCH on resource "%s"',res.name );
        return res.patch( direction.route, body );
      }
      else {
        return internals.promiseError( internals.format('[error] Resource not found "{0}"', route.pathname ), route.pathname );
      }
    }

    // 2 - Read the parameters from the route
    log.info('PATCH Target Found : %s (requires %d parameters)', self._name, paramCount );
    if ( paramCount>0 ) {
      if ( self._readParameters(route.path)<paramCount ) {
        later.reject( new rxError.RxError('Not enough paramters available in the URI ','PATCH '+self.name, 404));
        return later.promise;
      }
    }

    // 3 - call the resource defined function to respond to a PATCH request
    if ( self._onPatch ) {
      log.info('calling onPatch() for %s',self._name );
      this._cookies = route.cookies;  // The client code can retrieved the cookies using this.getCookies();
      self._onPatch( route.query, body )
        .then( ( response: ResourceResponse ) => {
          self._updateData(response.data);
          self._deliverReply(later, response, self._outFormat ? self._outFormat: route.outFormat  );
        })
        .fail( function( rxErr: rxError.RxError ) {
          later.reject(rxErr);
        });
      return later.promise;
    }

    // 4 - Perform the default PATH that is set the data directly
    log.info('Updating data for %s',self._name );
    self._updateData(body);
    var responseObj : ResourceResponse = { result: 'ok', httpCode: 200, data: self.data };
    self._deliverReply(later, responseObj, self._outFormat ? self._outFormat: route.outFormat  );
    return later.promise;
  }


  /*
   * HttpPlayer PUT
   * Asks that the enclosed entity be stored under the supplied URI.
   * The body sent to a post does not contain the resource name to be stored since that name is the URI.
  */
  put( route : routing.Route, body: any ) : Q.Promise<Embodiment> {
    var self = this; // use to consistently access this object.
    var log = internals.log().child( { func: 'ResourcePlayer('+self._name+').put'} );

    var later = Q.defer< Embodiment >();
    _.defer( () => { later.reject( new rxError.RxError('Not Implemented')) });
    return later.promise;
  }

}

export function site( name?: string ) : Site {
  return Site.$(name);
}
