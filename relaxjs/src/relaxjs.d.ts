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

  export interface IRxError extends Error {
    httpCode: number;
    getHttpCode(): number;
  }

  export class RxError implements IRxError {
    httpCode: number;
    public name: string;
    public message: string;
    public stack: string;
    constructor( message: string, name?: string, code?: number );
    getHttpCode(): number;
  }

  export module routing {

    export class Route {
      private name;
      constructor( name: string );
      paperino() : void ;
    }
    export class Direction {
      resource : Resource;
      route: Route;
    }
    export function fromUrl(request) : Route;
  }

  export class Embodiment {
    private data : Buffer;
    private mimeType: string;
    constructor( data : Buffer, mimeType: string );
    serve( response: http.ServerResponse) : void;
  }

  export interface ResourcePlayer {
    name(): string;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    post( route : routing.Route, body: string ) : Q.Promise<Embodiment> ;
  }

  export interface DataCallback {
    ( err: Error, data?: any ): void;
  }

  export interface Resource {
    name: string;
    view?: string;
    layout?: string;
    data?: any;
    resources?: Resource[];
    onGet?: ( query: any, cp:DataCallback ) => void;
    onPost?: ( query: any, body: string, cp:DataCallback ) => void;
  }

  export interface ResourceMap {
    [name: string]: ResourcePlayer;
  }

  export class Container {
    public _resources:ResourceMap;

    constructor();

    getFirstMatching( typeName: string ) : ResourcePlayer;
    add( newRes: Resource ) : void ;
    getByIdx( name: string, idx: number ) : ResourcePlayer ;
    childTypeCount( typeName: string ) : number ;
    childCount() : number;
    getDirection( route : routing.Route ) : routing.Direction;
  }

  export class Site extends Container implements ResourcePlayer {
    private static _instance : Site;
    private _name: string;
    private _siteName: string;
    private _version : string;

    constructor( siteName:string );
    public static $( name:string ):Site;
    name(): string;
    version: string;
    siteName: string;
    serve() : http.Server ;
    get( route : routing.Route ) : Q.Promise< Embodiment > ;
    post( req : routing.Route, body:string ) : Q.Promise< Embodiment > ;
  }

  export class ResourceServer extends Container implements ResourcePlayer {
    private _name: string;
    private _template: string;
    private _layout: string;
    private _onGet : ( query: any ) => Q.Promise<any>;
    private _onPost : ( query: any, body: string ) => Q.Promise<any>;

    constructor( res : Resource );
    name(): string;
    get(  route: routing.Route  ) : Q.Promise< Embodiment >;
    post( route: routing.Route  ) : Q.Promise< Embodiment >;
  }

  export function site( name?: string ) : Site;
  // export = relaxjs;
}
