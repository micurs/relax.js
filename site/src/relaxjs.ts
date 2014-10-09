///<reference path='./../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

/*
 * Dependencies
*/
import fs = require('fs');
import http = require("http");
import url = require('url');
import path = require('path')
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");
_.str = require('underscore.string');

// Internal function to emit error/warning messages
// ------------------------------------------------------------------------------
function emitCompileViewError( content: string, err: TypeError, filename: string ) : string {
  var fname = '[view error]';
  var errTitle = _.str.sprintf('<h1>%s Error while compiling: %s </h1>',fname, filename );
  var errMsg = _.str.sprintf('<p style="font-weight:bold;">Error: <span style="color:red;">%s</span></p>',_.escape(err.message) );
  var code =  _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>',_.escape(content));
  return _.str.sprintf('%s%s%s',errTitle,errMsg,code);
}

// ===================================================================================
export module Routing {

  export class Route {
    verb: string;
    static : boolean = true; // if true it means this rout is mapping to a file
    pathname : string;
    path : string[];
    query: string;
  }

  // --------------------------------------------------------------
  // GET /home/users?id=100
  // becomes
  // home.users.get(100)
  // PUT /home/users?id=100
  // becomes
  //  home.users.put( 100, data)
  // --------------------------------------------------------------
  export function fromUrl(request) : Route {
    console.log('[Routing.fromUrl] Original Request: '+request.url);

    if ( !request.url )
      request.url = '/';

    var reqToRoute : url.Url = url.parse(request.url, true);
    var extension = path.extname(reqToRoute.pathname)
    var resources : string[] = reqToRoute.pathname.split('/');//.splice(0,1);
    resources.unshift('site');

    var route = new Route();
    route.pathname = reqToRoute.pathname;
    route.query = reqToRoute.search;
    route.path = _.filter( resources, (res) => res.length>0 );
    console.log('[Routing.fromUrl] Path ('+route.path.length+') -> '+route.path );
    console.log('[Routing.fromUrl] Extension: ('+extension+')' );
    route.static = ( extension.length>0 ) ;
    return route;
  }

}

// Generic interface for a resource
// ===================================================================================
export interface Resource {
  Name: string;
  get( route : Routing.Route ) : Q.Promise<Embodiment> ;
}

// Every resource is converted to their embodiment before they can be served
// ===================================================================================
export class Embodiment {

  constructor( private data : Buffer, private mimeType: string ) { }

  serve(response: http.ServerResponse) : void {
    response.writeHead(200, { 'Content-Type' : this.mimeType, 'Content-Length': this.data.length } );
    response.write(this.data);
    response.end();
  }

}



// generic get for a static file
// -------------------------------------------------------------------------------
export function viewStatic( filename: string ) : Q.Promise< Embodiment > {
  var fname = '[view static]';
  var mtype = mime.lookup(filename);
  var laterAction = Q.defer< Embodiment >();
  var staticFile = '.'+filename;
  console.log( _.str.sprintf('%s %s',fname,staticFile) );
  fs.readFile( staticFile, function( err : Error, content : Buffer ) {
    if ( err )
      laterAction.reject( filename + ' not found');
    else
      laterAction.resolve( new Embodiment( content, mtype ) );
  });
  return laterAction.promise;
}

// Return a promise that will return the full content of the view + the viewdata.
// -------------------------------------------------------------------------------
export function view( viewName: string,
                      viewData: any,
                      layoutName?: string ) : Q.Promise< Embodiment > {
  var fname = '[view]';
  var readFile = Q.denodeify(fs.readFile);
  var laterAct = Q.defer<Embodiment>();
  var templateFilename = './views/'+viewName+'._';
  if ( layoutName !== undefined ) {
    var layoutFilename = './views/_'+layoutName+'._';
    Q.all( [ readFile( templateFilename,  { 'encoding':'utf8'} ), readFile( layoutFilename,  { 'encoding':'utf8'} ) ])
    .spread( ( content: string, outerContent : string) => {
      try {
        console.log(_.str.sprintf('%s Compiling composite view %s in %s',fname,layoutFilename,templateFilename));
        var innerContent = new Buffer( _.template(content)(viewData), 'utf-8' );
        var fullContent = new Buffer( _.template(outerContent)( { page: innerContent, name: viewData.Name }), 'utf-8');
        laterAct.resolve( new Embodiment( fullContent, 'utf-8' ));
      }
      catch( e ) {
        laterAct.reject( emitCompileViewError(content,e, templateFilename +' in '+ layoutFilename) );
      }
    })
    .catch( (err : Error ) => {
      laterAct.reject( emitCompileViewError('N/A',err, templateFilename +' in '+ layoutFilename ) );
    });
  }
  else {
    readFile( templateFilename,  { 'encoding':'utf8'} )
    .then( ( content:string ) => {
      try {
        console.log(_.str.sprintf('%s Compiling view %s',fname, templateFilename));
        var fullContent = new Buffer( _.template(content)(viewData) , 'utf-8') ;
        laterAct.resolve( new Embodiment( fullContent, 'utf-8' ));
      }
      catch( e ) {
        laterAct.reject( emitCompileViewError(content,e, templateFilename ) );
      }
    })
    .catch( ( err : Error ) => {
      laterAct.reject( emitCompileViewError('N/A',err, templateFilename ) );
    });
  }
  return laterAct.promise;
}


// Root object for the application is the Site.
// The site is in itself a Resource and is accessed via the root / in a url.
// ===================================================================================
export class Site implements Resource {
  private static _instance : Site = null;
  public Name: string = "site";

  private _resources:any = {};
  private _version : string = '0.0.1';

  constructor( public siteName:string ) {
    if(Site._instance){
      throw new Error("Error: Only one site is allowed.");
    }
    Site._instance = this;
  }

  public static $( name:string ):Site
  {
    if(Site._instance === null) {
      Site._instance = new Site(name);
    }
    return Site._instance;
  }

  addResource( resource : Resource ) : Boolean {
    resource['_version'] = this._version;
    resource['siteName'] = this.siteName;
    this._resources[resource.Name] = resource;
    console.log( _.str.sprintf('[addResource] : %s', JSON.stringify(_.keys(this._resources)) ) );
    return false;
  }

  serve( port:number = 3000 ) {
    return http.createServer( (request, response) => {
      console.log('\n========================');
      console.log('Received request for :'+request.url);
      // here we need to route the call to the appropriate class:
      var route : Routing.Route = Routing.fromUrl(request);

      this.get( route )
        .then( ( rep : Embodiment ) => {
          rep.serve(response);
        })
        .fail(function (error) {
          response.writeHead(404, {"Content-Type": "text/html"} );
          response.write(error);
          response.end();
        })
        .done();
    });
  }

  get( route : Routing.Route ) : Q.Promise< Embodiment > {
    var contextLog = '['+this.Name+'.get] ';
    console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

    if ( route.static ) {
      console.log( contextLog + 'Static Route -> fetching the file: '+ route.pathname );
      return viewStatic( route.pathname );
    }
    else {
      console.log( contextLog + 'Dynamic Route -> following the path ' );
      if ( route.path.length > 1 ) {
        if ( route.path[1] in this._resources ) {
          console.log( contextLog + 'Found resource for '+ route.path[1] );
          var partialRoute = _.clone(route);
          partialRoute.path = route.path;
          return this._resources[route.path[1]].get( partialRoute );
        }
      }
      //var resArray:Resource[] = _.map<any,Resource>( this._resources, function(item, key) { return item; } );
      //var list:string = _.reduce<Resource,string>( _.values(this._resources), (m :string ,item) => m+= "<li>"+item.Name+"</li>"  );
      console.log( contextLog + 'Resources : [ '+ JSON.stringify(_.values(this._resources)) +' ]' );
      return view(this.Name, this );
    }
  }

}

export module Resources {
  // ===================================================================================
  export class Data implements Resource {
    constructor( public Name: string ) {}
    get( route: Routing.Route )  : Q.Promise< Embodiment > {
      var later = Q.defer< Embodiment>();
      var readFile = Q.denodeify(fs.readFile);
      var dataFile = './data/'+this.Name+'.json';
      readFile( dataFile)
        .then( (content: Buffer ) => {
          later.resolve(new Embodiment(content, 'application/json' ));
        })
        .catch( ( err : Error ) => {
          later.reject( emitCompileViewError('N/A',err, dataFile ) );
        });
      return later.promise;
    }
  }

  // ===================================================================================
  export class HtmlView implements Resource {
    public Name: string = "site";

    constructor( public viewName: string, public layout?: string ) {
      this.Name = viewName;
    }

    get( route : Routing.Route ) : Q.Promise< Embodiment > {
      var contextLog = '['+this.Name+'.get] ';
      console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

      // Here we compute/fetch/create the view data.
      return view(this.Name,this, this.layout );
    }
  }
}
/*
var relaxjs = {
  Route: r.Route,
  Embodiment: r.Embodiment
}

export = relaxjs;
*/
