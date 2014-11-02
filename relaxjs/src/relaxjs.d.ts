///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
/*
Realx.js v 0..1 type definitons
*/

declare module "relaxjs" {
  import http = require('http');

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
      constructor( message: string, name?: string, code?: number );
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
    name(): string;
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
    [name: string]: HttpPlayer;
  }

  export class Container {
    public _resources:ResourceMap;
    private _parent: Container;

    parent : Container ;

    constructor( parent?: Container );

    remove( child: HttpPlayer ) : boolean;
    getFirstMatching( typeName: string ) : HttpPlayer;
    add( newRes: Resource ) : void ;
    getChild( name: string, idx: number ) : HttpPlayer ;
    childTypeCount( typeName: string ) : number ;
    childrenCount() : number;
    getDirection( route : routing.Route ) : routing.Direction;
  }

  export class Site extends Container implements HttpPlayer {
    private static _instance : Site ;
    private _name: string;
    private _version : string;
    private _siteName : string;
    private _home : string;
    private _pathCache;

    constructor( siteName:string, parent?: Container );
    public static $( name:string ):Site;
    name(): string;
    setName( newName:string ) : void ;
    version: string;
    siteName: string;
    setPathCache( path: string, shortcut: { resource: ResourcePlayer; path: string[] } ) : void;
    serve() : http.Server ;
    setHome( path: string ) : void;

    head( route : routing.Route) : Q.Promise<Embodiment> ;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    post( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    put( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
    delete( route : routing.Route ) : Q.Promise<Embodiment> ;
    patch( route : routing.Route, body: any ) : Q.Promise<Embodiment> ;
  }

  export class ResourcePlayer extends Container implements HttpPlayer {
    private _name: string;
    private _template: string;
    private _layout: string;
    private _onGet : ( query: any ) => Q.Promise<any>;
    private _onPost : ( query: any, body: string ) => Q.Promise<any>;

    constructor( res : Resource );
    name(): string;
    ok( response: DataCallback, data?: any ) : void;
    redirect( response: DataCallback, where: string, data?: any ) : void ;
    fail( response: DataCallback, data?: any ) : void;
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
