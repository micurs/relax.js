///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

import fs = require('fs');
import Q = require('q');
import mime = require('mime');

var _ = require("underscore");

// Application Resources
export module Resources {

  export interface Resource {
    get() : Q.Promise<string> ;
  }

  export function get( filename: string ) : Q.Promise< Buffer > {
    var laterAction = Q.defer< Buffer >();
    var staticFile = '.'+filename;
    console.log('[static get] Reading file: '+ staticFile );
    fs.readFile( staticFile, function( err : Error, content : Buffer ) {
      if ( err )
        laterAction.reject( filename + ' not found');
      else
        console.log('[static get] OK! ');
        laterAction.resolve(content);
    });
    return laterAction.promise;
  }

  export class Home implements Resource {

    msg : string;

    constructor( msg: string ) {
      this.msg = msg;
    }

    get() : Q.Promise<string> {
      var self = this;
      var laterAction = Q.defer<string>();
      var template = "./src/home._"; // __dirname+'/../src/home._';
      console.log('Reading file: '+ template );
      fs.readFile( template, "utf-8", function( err : Error, content : string ) {
        if (err) {
          laterAction.reject("File home._ not found");
        }
        else {
          console.log("Compiling ...");
          var compiled = _.template(content);
          var fullContent : string = compiled(self);
          console.log("done.");
          laterAction.resolve(fullContent);
        }
      });
      return laterAction.promise;
    }
  }
}
