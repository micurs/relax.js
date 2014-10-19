
/*
declare module relaxjs {
}
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

  export interface Resource {
    name(): string;
    get( route : routing.Route ) : Q.Promise<Embodiment> ;
    addResource( res : Resource ) : Boolean;
  }

  export interface ResourceMap {
    [name: string]: Resource;
  }

  export class Container {
    public _resources:ResourceMap;

    constructor();
    getFirstMatching( typeName: string ) : Resource;
    addResource( typeName: string, newRes: Resource ) : void ;
    add( newRes: Resource ) : void ;
    getByIdx( name: string, idx: number ) : Resource ;
    childTypeCount( typeName: string ) : number ;
    childCount() : number;
    getDirection( route : routing.Route ) : routing.Direction;
  }

  export class Site extends Container implements Resource {
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
  }

  /*
  export class DynamicHtml extends Container implements Resource {
    private _name: string;
    private _template: string;
    private _layout: string;
    constructor( viewName: string, layout?: string, moredata?: any );
    name() : string;
    setName( newName:string ) : void ;
    get(  route: routing.Route  ) : Q.Promise< Embodiment >;
    post( route: routing.Route  ) : Q.Promise< Embodiment >;
  }

  export function site( name : string ) : Site;

    export module resources {

    export class Data implements Resource {
      private _name: string;
      private _resources:ResourceMap;

      constructor( Name: string );
      name() : string;
      setName( newName:string ) : void ;
      get( route: routing.Route )  : Q.Promise< Embodiment >;
      post( route: routing.Route  ) : Q.Promise< Embodiment > ;
    }
    */


  }

  // export = relaxjs;
}
