///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./relaxjs.ts' />

import fs = require('fs');
import mime = require('mime');
import Q = require('q');
import querystring = require('querystring');

import _ = require("underscore");
_.str = require('underscore.string');

import relaxjs = require('./relaxjs');

export function parseData( bodyData: string,  contentType: string ) {
  try {
    if ( contentType === 'application/json' ) {
      console.log(_.str.sprintf('BODY DECODING: "%s"',bodyData) );
      return JSON.parse(bodyData);
    }
    else
      return querystring.parse(bodyData);
  }
  catch( err ) {
    console.log('ERROR PARSING INCOMING DATA: '+ err );
    return {};
  }
}

// Internal functions to emit error/warning messages
export function emitCompileViewError( content: string, err: TypeError, filename: string ) : relaxjs.RxError {
  var fname = '[view error]';
  var errTitle = _.str.sprintf('%s while compiling: %s',fname, filename );
  var errMsg = err.message;
  var code =  _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>',_.escape(content));
  console.log(errTitle);
  console.log(errMsg);
  return new relaxjs.RxError(errMsg, errTitle, 500, code );
}

export function emitError( content: string, filename: string ) : relaxjs.RxError {
  var fname = '[error]';
  var errTitle = _.str.sprintf('%s while serving: %s',fname, filename );
  var errMsg = content;
  return new relaxjs.RxError(errMsg, errTitle, 500 );
}

export function promiseError( msg: string, resName : string ) : Q.Promise< relaxjs.Embodiment > {
  console.log(msg);
  var later = Q.defer< relaxjs.Embodiment >();
  later.reject( emitError(msg, resName )  );
  return later.promise;
}

export function redirect( location: string ) : Q.Promise< relaxjs.Embodiment > {
  var later = Q.defer< relaxjs.Embodiment >();
  _.defer( () => {
    var redir = new relaxjs.Embodiment('text/html');
    redir.httpCode = 307; // Temporary Redirect (since HTTP/1.1)
    redir.location = location;
    later.resolve(redir);
    });
  return later.promise;
}

// Realize a view from a generic get for a static file
// Return a promise that will return the full content of the view.
// -------------------------------------------------------------------------------
export function viewStatic( filename: string ) : Q.Promise< relaxjs.Embodiment > {
  var fname = '[view static]';
  var mtype = mime.lookup(filename);
  var laterAction = Q.defer< relaxjs.Embodiment >();
  var staticFile = '.'+filename;
  // console.log( _.str.sprintf('%s %s',fname,staticFile) );
  fs.readFile( staticFile, function( err : Error, content : Buffer ) {
    if ( err ) {
      // console.log( _.str.sprintf('%s ERROR file "%s" not found',fname,staticFile) );
      laterAction.reject( new relaxjs.RxError( filename + ' not found', 'File Not Found', 404 ) );
    }
    else {
      laterAction.resolve( new relaxjs.Embodiment( mtype, content ) );
    }
  });
  return laterAction.promise;
}


// Return a promise for a JSON Embodiment for the given data.
// Note that this function strips automatically all the data item starting with '_'
// (undercore) since - as a convention in relax.js - these are private member variables.
// -------------------------------------------------------------------------------
export function viewJson( viewData: any ) : Q.Promise< relaxjs.Embodiment > {
  var later = Q.defer< relaxjs.Embodiment >();
  _.defer( () => {
    var e = new relaxjs.Embodiment( 'application/json',
      new Buffer(
        JSON.stringify(
          viewData,
          ( key : string, value : any ) => { return ( key.indexOf('_') === 0 ) ?  undefined : value; }),
          'utf-8')
    );
    later.resolve( e );
  });
  return later.promise;
}

// Realize the given view (viewName) merging it with the given data (viewData)
// It can use an embedding view layout as third argument (optional)
// Return a promise that will return the full content of the view + the viewdata.
// -------------------------------------------------------------------------------
export function viewDynamic( viewName: string,
                      viewData: any,
                      layoutName?: string ) : Q.Promise< relaxjs.Embodiment > {
  var fname = '[view] ';
  var laterAct = Q.defer< relaxjs.Embodiment >();
  var readFile = Q.denodeify(fs.readFile);

  //console.log( _.str.sprintf('%s  dynamic %s for %s',fname,viewName,JSON.stringify(viewData,null,'  ') ) );
  var templateFilename = './views/'+viewName+'._';
  if ( viewName === 'site') {
    templateFilename = __dirname+'/../views/'+viewName+'._';
  }
  if ( layoutName ) {
    // console.log( _.str.sprintf('%s Using Layout "%s"',fname,layoutName) );
    var layoutFilename = './views/'+layoutName+'._';
    Q.all( [ readFile( templateFilename,  { 'encoding':'utf8'} ),
             readFile( layoutFilename,    { 'encoding':'utf8'} ) ])
    .spread( ( content: string, outerContent : string) => {
      try {
        console.log(_.str.sprintf('%s Compiling composite view %s in %s',fname,layoutFilename,templateFilename));
        var innerContent = new Buffer( _.template(content)(viewData), 'utf-8' );
        var fullContent = new Buffer( _.template(outerContent)( { page: innerContent, name: viewData.Name }), 'utf-8');
        laterAct.resolve( new relaxjs.Embodiment( 'text/html', fullContent ));
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
    // console.log( _.str.sprintf('%s Using View "%s"',fname,templateFilename) );
    readFile( templateFilename,  { 'encoding':'utf8'} )
    .then( ( content:string ) => {
      try {
        console.log(_.str.sprintf('%s Compiling view %s',fname, templateFilename ));
        var fullContent = new Buffer( _.template(content)(viewData) , 'utf-8') ;
        laterAct.resolve( new relaxjs.Embodiment( 'text/html', fullContent ));
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
