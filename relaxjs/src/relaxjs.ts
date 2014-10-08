///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

/*
 * Dependencies
*/
import fs = require('fs');
import http = require("http");
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

// Generic route for HTTP requests
// ------------------------------------------------------------------------------
export class Route {
  verb: string;
  static : boolean = true; // if true it means this rout is mapping to a file
  pathname : string;
  path : string[];
  query: string;
}

// Generic interface for a resource
// ------------------------------------------------------------------------------
export interface Resource {
  Name: string;
  get( route : Route ) : Q.Promise<Embodiment> ;
}

// Every resource is converted to their embodiment before they can be served
// ------------------------------------------------------------------------------
export class Embodiment {

  constructor( private data : Buffer, private mimeType: string ) { }

  serve(response: http.ServerResponse) : void {
    response.writeHead(200, { 'Content-Type' : this.mimeType, 'Content-Length': this.data.length } );
    response.write(this.data);
    response.end();
  }

}
