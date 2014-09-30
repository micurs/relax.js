///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

// System and third party import
import fs = require('fs');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");

// Application Resources
export module Resources {

  // Generic interface for a resource
  export interface Resource {
    get() : Q.Promise<string> ;
  }

  // generic get for a static file
  export function get( filename: string ) : Q.Promise< Buffer > {
    var laterAction = Q.defer< Buffer >();
    var staticFile = '.'+filename;
    fs.readFile( staticFile, function( err : Error, content : Buffer ) {
      if ( err )
        laterAction.reject( filename + ' not found');
      else
        console.log('[static get] '+ staticFile );
        // console.log('[static get] OK! ');
        laterAction.resolve(content);
    });
    return laterAction.promise;
  }

  export class ViewResource {

    constructor( private viewName: string ) { }

    // Return a promise that will return the full content of the view + the viewdata.
    view( viewData: any ) : Q.Promise<string> {
      var laterAct = Q.defer<string>();
      var templateFilename = './views/'+this.viewName+'._';
      fs.readFile( templateFilename, "utf-8", function( err : Error, content : string ) {
        if (err) {
          laterAct.reject('[ViewResource] File '+ templateFilename +' not found');
        }
        else {
          console.log('[ViewResource] Compiling '+templateFilename);
          // TODO: Error management needed here
          var compiled = _.template(content);
          var fullContent : string = compiled(viewData);
          console.log('[ViewResource] done.');
          laterAct.resolve(fullContent);
        }
      });
      return laterAct.promise;
    }
  }

  export class Home extends ViewResource implements Resource {

    constructor( public msg: string ) {
      super('home');
    }

    get() : Q.Promise<string> {
      // Here we compute/fetch/create the view data.
      return super.view(this);
    }
  }
}
