///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

// System and third party import
import http = require("http");
import fs = require('fs');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");

import controller = require("./controller"); // routing functions

// Application Resources
export module Resources {

  export class Embodiment {
    constructor( private data : Buffer, private mimeType: string ) { }

    serve(response: http.ServerResponse) : void {
      response.writeHead(200, { 'Content-Type' : this.mimeType, 'Content-Length': this.data.length } );
      response.write(this.data);
      response.end();
    }
  }

  // Generic interface for a resource
  export interface Resource {
    Name: string;
    get( route : controller.Routing.Route ) : Q.Promise<Embodiment> ;
  }

  function respond( response: http.ServerResponse, content : Buffer, mtype: string ) {
    response.writeHead(200, { 'Content-Type' : mtype, 'Content-Length': content.length } );
    response.write(content);
    response.end();
  }

  // generic get for a static file
  export function viewStatic( filename: string ) : Q.Promise< Embodiment > {
    var mtype = mime.lookup(filename);
    var laterAction = Q.defer< Embodiment >();
    var staticFile = '.'+filename;
    console.log('[static view] '+ staticFile );
    fs.readFile( staticFile, function( err : Error, content : Buffer ) {
      if ( err )
        laterAction.reject( filename + ' not found');
      else
        console.log('[static view] done' );
        laterAction.resolve( new Embodiment( content, mtype ) );
    });
    return laterAction.promise;
  }

  // Return a promise that will return the full content of the view + the viewdata.
  export function view( viewName: string, viewData: any ) : Q.Promise< Embodiment > {
    var laterAct = Q.defer<Embodiment>();
    var templateFilename = './views/'+viewName+'._';
    console.log('[view] template: "'+viewName+'"\t\tdata:'+ JSON.stringify(viewData) );
    console.log('[view] template file name: "'+templateFilename+'" ');
    fs.readFile( templateFilename, 'utf-8', function( err : Error, content : string ) {
      if (err) {
        console.log('[View] File '+ templateFilename +' not found');
        laterAct.reject('[View] File '+ templateFilename +' not found');
      }
      else {
        console.log('[View] Compiling '+templateFilename);
        try {
          //console.log('[View] Original content '+content);
          var compiled = _.template(content);
          var fullContent = new Buffer( compiled(viewData) , 'utf-8') ;
          //console.log('[View] compiled content '+fullContent);
          console.log('[View] done.');
          laterAct.resolve( new Embodiment( fullContent, 'utf-8' ));
        }
        catch( e ) {
          laterAct.reject( '<h1>[View] View Compile Error</h1><pre>'+_.escape(content)+'</pre><p style="color:red; font-weight:bold;">'+ e +'</p>'  );
        }
      }
    });
    return laterAct.promise;
  }

  // Root object for the application is the Site.
  // The site is in itself a Resource and is accessed via the root / in a url.
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
      this._resources[resource.Name] = resource;
      console.log( 'Resources : [ '+ JSON.stringify(_.values(this._resources)) +' ]' );
      return false;
    }

    serve( port:number = 3000 ) {
      return http.createServer( (request, response) => {
        console.log('\n========================');
        console.log('Received request for :'+request.url);
        // here we need to route the call to the appropriate class:
        var route : controller.Routing.Route = controller.Routing.fromUrl(request);

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

    get( route : controller.Routing.Route ) : Q.Promise< Embodiment > {
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

  export class HtmlView implements Resource {
    public Name: string = "site";

    constructor( public viewName: string ) {
      this.Name = viewName;
    }

    get( route : controller.Routing.Route ) : Q.Promise< Embodiment > {
      var contextLog = '['+this.Name+'.get] ';
      console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

      // Here we compute/fetch/create the view data.
      return view(this.Name,this);
    }
  }
}
