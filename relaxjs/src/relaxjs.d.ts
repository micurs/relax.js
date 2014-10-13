
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
    Name: string;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
  }

  export class Site implements Resource {
    private static _instance : Site;
    public Name: string;
    public siteName:string;
    private _resources:any;
    private _version : string;

    constructor( siteName:string );
    public static $( name:string ):Site;
    addResource( resource : Resource ) : Boolean ;
    serve( port:number ) ;
    get( route : routing.Route ) : Q.Promise< Embodiment > ;
  }


  // ===== resources =======================================================
  export module resources {
    export class Data implements Resource {
      public Name: string;
      constructor( Name: string );
      get( route: routing.Route )  : Q.Promise< Embodiment >;
    }
    export class HtmlView implements Resource {
      public Name: string;
      public layout: string;
      constructor( viewName: string, layout?: string );
      get( route : routing.Route ) : Q.Promise< Embodiment >;
    }

  }

  // export = relaxjs;
}
