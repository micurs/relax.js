
/*
Realx.js v 0..1 type dfiinitons
*/

declare module "relaxjs" {
  import http = require('http');

  export function relax(): void;

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

  export interface ResourceMap {
    [name: string]: ResourcePlayer;
  }

  export class Container {
    public _resources:ResourceMap;

    constructor();

    getFirstMatching( typeName: string ) : ResourcePlayer;
    add( typeName: string, newRes: Resource ) : void ;
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
    setName( newName:string ) : void;
    version: string;
    siteName: string;
    serve() : http.Server ;
    get( route : routing.Route ) : Q.Promise< Embodiment > ;
    post( req : routing.Route ) : Q.Promise< Embodiment > ;
  }

  export function site( name?: string ) : Site;
  // export = relaxjs;
}
