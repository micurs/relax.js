
/*
 * Realx.js v 0.1.1 type definitons
 * Project: https://github.com/micurs/relax.js
 * Definitions by: Michele Ursino <http://github.com/micurs>
*/

declare module "relaxjs" {
  import http = require('http');

  export var version: string;

  export function relax(): void;

  export module rxError {

    export interface IRxError extends Error {
      httpCode: number;
      extra: string;
      getHttpCode(): number;
      getExtra(): string;
    }

    export class RxError implements IRxError {
      httpCode: number;
      extra: string;
      public name: string;
      public message: string;
      public stack: string;
      constructor( message: string, name?: string, code?: number, extra?: string );
      getHttpCode(): number;
      getExtra(): string;
      toString(): string;
    }
  }

  export module routing {

    export class Route {
      verb: string;
      static : boolean; // if true it means this rout is mapping to a file
      pathname : string;
      path : string[];
      query: any;
      outFormat: string;
      inFormat : string;
      cookies: string[]; // Unparsed cookies received withing the request.
      request: http.ServerRequest;
      response: http.ServerResponse;

      constructor( uri?: string );
      stepThrough( stpes: number ) : Route;
      getNextStep() : string;
    }
    export class Direction {
      resource : HttpPlayer;
      route: Route;
    }
    export function fromUrl( request: http.ServerRequest ) : Route ;
  }

  export class Embodiment {
    public httpCode : number;
    public location : string;
    public data : Buffer;
    public mimeType : string;
    constructor(  mimeType: string, data?: Buffer );
    serve(response: http.ServerResponse) : void;
    dataAsString() : string ;
  }

  export interface HttpPlayer {
    name: string;
    urlName: string;

    head( route : routing.Route) : Q.Promise<Embodiment> ;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    put( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    delete( route : routing.Route ) : Q.Promise<Embodiment> ;
    patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
  }

  export interface ResourceResponse {
    result: string;
    data?: any;
    httpCode?: number;
    location?: string;
  }

  export interface DataCallback {
    ( err: Error, data?: ResourceResponse ): void;
  }

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

  export interface ResourceMap {
    [name: string]: ResourcePlayer;
  }

  export class Container {
    name: string;
    urlName: string;
    public _resources:ResourceMap;
    public parent : Container ;

    constructor( parent?: Container );
    setCookie( cookie: string );
    getCookies( ) : string[];

    ok( response: DataCallback, data?: any ) : void;
    redirect( response: DataCallback, where: string, data?: any ) : void ;
    fail( response: DataCallback, data?: any ) : void;

    add( newRes: Resource ) : void ;
    remove( child: ResourcePlayer ) : boolean ;
    getResource( pathname: string ) : Container ;
    getFirstMatching( typeName: string ) : ResourcePlayer;
    getChild( name: string, idx: number ) : ResourcePlayer ;
    childTypeCount( typeName: string ) : number ;
    childrenCount() : number;
  }

  export interface FilterResultCB {
    ( err: rxError.RxError, data: any ) : void;
  }

  export interface FilterCB {
    ( route : routing.Route, body: any, resultCall : FilterResultCB ) : void ;
  }

  export class Site extends Container implements HttpPlayer {
    version: string;
    siteName: string;
    enableFilters: boolean;

    constructor( siteName:string, parent?: Container );
    public static $( name:string ):Site;
    setName( newName:string ) : void ;
    setPathCache( path: string, shortcut: { resource: ResourcePlayer; path: string[] } ) : void;
    serve() : http.Server ;
    setHome( path: string ) : void;
    getResource( pathname: string ) : Container;
    addRequestFilter( filterFunction: FilterCB ) : void;
    deleteRequestFilter( filterFunction?: FilterCB ) : boolean;

    head( route : routing.Route) : Q.Promise<Embodiment> ;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    put( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    delete( route : routing.Route ) : Q.Promise<Embodiment> ;
    patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
  }


  export class ResourcePlayer extends Container implements HttpPlayer {
    name: string;
    urlName: string;

    constructor( res : Resource );
    readParameters( path: string[]) : number ;

    head( route : routing.Route) : Q.Promise<Embodiment> ;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    put( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    delete( route : routing.Route ) : Q.Promise<Embodiment> ;
    patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
  }

  export function site( name?: string ) : Site;
  // export = relaxjs;
}
