///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />

var fs = require('fs');
var Q = require('q');

import _ = require("underscore");

// Application Resources
export module resources {

  export class home {
    msg : string;
    constructor( msg: string ) {
      this.msg = msg;
    }
    get() : Q.Promise<string> {
      var self = this;
      var laterAction = Q.defer();
      var template = __dirname+'/../src/home._';
      console.log('Reading file: '+ template );
      fs.readFile( template, "utf-8", function( err : boolean, content : string ) {
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
