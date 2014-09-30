///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

// System and third party import
import fs = require('fs');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");

import controller = require("./controller"); // routing functions

// Application Resources
export module Resources {

  export class Embodiment {
    data : Buffer;
    mimeType: string;
  }

  // Generic interface for a resource
  export interface Resource {
    get( route? : controller.Routing.Route ) : Q.Promise<Embodiment> ;
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
        laterAction.resolve( { data: content, mimeType: mtype } );
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
        // TODO: Error management needed here
        var compiled = _.template(content);
        var fullContent = new Buffer( compiled(viewData) , 'utf-8') ;
        console.log('[View] done.');
        laterAct.resolve( { data: fullContent, mimeType: 'utf-8' }  );
      }
    });
    return laterAct.promise;
  }

  // Root object for the application is the Site.
  // The site is in itself a Resource and is accessed via the root / in a url.
  export class Site implements Resource {
    private static _instance : Site = null;
    private _name : string = 'home';
    private _version : string = '0.0.1';

    constructor() {
      if(Site._instance){
        throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
      }
      Site._instance = this;
    }

    public static $():Site
    {
      if(Site._instance === null) {
        Site._instance = new Site();
      }
      return Site._instance;
    }

    get( route? : controller.Routing.Route ) : Q.Promise< Embodiment > {
      var contextLog = '['+this._name+'.get] ';
      console.log( contextLog + 'Fetching the resource : [ '+ route.path +' ]' );

      if ( route.static ) {
        console.log( contextLog + 'Static Route -> fetching the file: '+ route.pathname );
        return viewStatic( route.pathname );
      }
      else {
        console.log( contextLog + 'Dynamic Route -> follow the path' );
        return view(this._name,this);
      }
    }

  }

  export class Home implements Resource {

    constructor( public msg: string ) {
    }

    get() : Q.Promise<Embodiment> {
      // Here we compute/fetch/create the view data.
      return view('home',this);
    }
  }
}
