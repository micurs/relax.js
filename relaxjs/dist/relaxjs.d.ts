
/*
declare module relaxjs {
}
*/

declare module "relaxjs" {
  import http = require('http');

  export function relax(): void;

  // ===== resources =======================================================
  export module routing {
    export class Route {
      private name;
      constructor( name: string );
      paperino() : void ;
    }
    export function fromUrl(request) : Route;
  }

  export class Embodiment {
    private data : Buffer;
    private mimeType: string;
    constructor( data : Buffer, mimeType: string );
    serve( response: http.ServerResponse) : void;
  }

  export interface Resource {
    name(): string;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    addResource( res : Resource ) : Boolean;
  }

  export interface ResourceMap {
    [name: string]: Resource;
  }

  export class Site implements Resource {
    private static _instance : Site;
    private _name: string;
    public siteName:string;
    private _resources:ResourceMap;
    private _version : string;

    constructor( siteName:string );
    public static $( name:string ):Site;

    serve() : http.Server ;

    name(): string;
    get( route : routing.Route ) : Q.Promise< Embodiment > ;
    addResource( resource : Resource ) : boolean;
  }

  export function site( name : string ) : Site;

  // ===== resources =======================================================
  export module resources {

    export class Data implements Resource {
      private _name: string;
      private _resources:ResourceMap;

      constructor( Name: string );
      name() : string;
      get( route: routing.Route )  : Q.Promise< Embodiment >;
      addResource( res : Resource ) : boolean ;
    }

    export class HtmlView implements Resource {
      private _name: string;
      private _resources:ResourceMap;
      public layout: string;

      constructor( viewName: string, layout?: string );
      name() : string;
      get( route : routing.Route ) : Q.Promise< Embodiment >;
      addResource( res : Resource ) : boolean;
    }

  }

  // export = relaxjs;
}
