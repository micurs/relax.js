/*
 * Relax.js version 0.1.2
 * by Michele Ursino Nov - 2014
*/

///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/lodash/lodash.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='../typings/bunyan/bunyan.d.ts' />
///<reference path='../typings/xml2js/xml2js.d.ts' />

///<reference path='./relaxjs.ts' />

import fs = require('fs');
import mime = require('mime');
import Q = require('q');
import querystring = require('querystring');
import bunyan = require('bunyan');
import _ = require("lodash");
import xml2js = require('xml2js');


import relaxjs = require('./relaxjs');
import rxError = require('./rxerror');


var _log : bunyan.Logger;
var _appName : string;

/*
 * Bunyan log utilities
*/

export function setLogVerbose( flag : boolean ) {
  _log.level(bunyan.INFO);
}

export function initLog( appName : string ) {
  _appName = appName;
  _log = bunyan.createLogger( { name: appName} );
  _log.level(bunyan.WARN);
}

export function log(): bunyan.Logger {
  if ( !_log ) {
    _log = bunyan.createLogger( { name: 'no app'} );
    _log.level(bunyan.WARN);
  }
  return _log;
}


export function format( source: string , ...args: any[]): string {
 return source.replace(/{(\d+)}/g, function( match: any , n: number) {
    return typeof args[n] != 'undefined'
      ? args[n]
      : match
    ;
  });
}


export function slugify ( source: string ): string
{
  var res = source.toLowerCase()
                  .replace(/\s+/g, '-')           // Replace spaces with -
                  .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                  .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                  .replace(/^-+/, '')             // Trim - from start of text
                  .replace(/-+$/, '');
  return res;
}




/*
 * Parse the body of a request according the given mime-type
*/
export function parseData( bodyData: string,  contentType: string ) : Q.Promise<any> {
  var log = _log.child( { func: 'internals.parseData'} );
  var later = Q.defer< any >();
  if ( !bodyData || bodyData.length==0 ) {
    later.resolve({});
    return later.promise;
  }
  var mimeType = contentType.split(/[\s,]+/)[0];
  log.info('Parsing "%s" as (%s)',bodyData,mimeType);
  try {
    switch(mimeType) {
      case 'application/xml':
      case 'text/xml':
        xml2js.parseString( bodyData, { explicitRoot: false, explicitArray: false },
          function( err: Error, res:any ) {
            if (err) {
              _log.error('Error parsing XML data with ' );
              _log.error( err );
              later.reject(err);
            }
            else {
              log.info('Parsed XML as: %s', JSON.stringify(res));
              later.resolve(res);
            }
          });
          break;
      case 'application/x-www-form-urlencoded':
        later.resolve( querystring.parse(bodyData) );
        break;
      case 'application/json':
      default:
        later.resolve( JSON.parse(bodyData) );
    }
  }
  catch( err ) {
    _log.error('Error parsing incoming data with %s',contentType );
    _log.error( err );
    later.reject(err);
  }
  return later.promise;
}

// Internal functions to emit error/warning messages
export function emitCompileViewError( content: string, err: TypeError, filename: string ) : rxError.RxError {
  var errTitle = '[error] Compiling View: %s'+ filename ;
  var errMsg = err.message;
  var code =  format('<h4>Content being compiled</h4><pre>{0}</pre>', _.escape(content));
  _log.error(errTitle);
  return new rxError.RxError(errMsg, errTitle, 500, code );
}

/*
 * Creates a RxError object with the given message and resource name
 */
export function emitError( content: string, resname: string ) : rxError.RxError {
  var errTitle = format('[error.500] Serving: {0}', resname);
  var errMsg = content;
  _log.error(errTitle);
  return new rxError.RxError(errMsg, errTitle, 500 );
}

/*
 * Emits a promise for a failure message
*/
export function promiseError( msg: string, resName : string ) : Q.Promise< relaxjs.Embodiment > {
  var later = Q.defer< relaxjs.Embodiment >();
  _.defer( () => {
    _log.error(msg);
    later.reject( emitError( msg, resName )  )
  });
  return later.promise;
}

/*
 * Create a Redirect embodiment to force the requester to get the given location
*/
export function redirect( location: string ) : Q.Promise< relaxjs.Embodiment > {
  var later = Q.defer< relaxjs.Embodiment >();
  _.defer( () => {
    _log.info('Sending a Redirect 307 towards %s',location );
    var redir = new relaxjs.Embodiment('text/html');
    redir.httpCode = 307; // Temporary Redirect (since HTTP/1.1)
    redir.location = location;
    later.resolve(redir);
    });
  return later.promise;
}

/*
 * Realize a view from a generic get for a static file
 * Return a promise that will return the full content of the view.
*/
export function viewStatic( filename: string ) : Q.Promise< relaxjs.Embodiment > {
  var fname = '[view static]';
  var log = _log.child( { func: 'internals.viewStatic'} );

  var mtype = mime.lookup(filename);
  var laterAction = Q.defer< relaxjs.Embodiment >();
  var staticFile = '.'+filename;
  log.info('serving %s %s',fname,staticFile);
  fs.readFile( staticFile, function( err : Error, content : Buffer ) {
    if ( err ) {
      log.warn('%s file "%s" not found',fname,staticFile);
      laterAction.reject( new rxError.RxError( filename + ' not found', 'File Not Found', 404 ) );
    }
    else {
      laterAction.resolve( new relaxjs.Embodiment( mtype, content ) );
    }
  });
  return laterAction.promise;
}

/*
 * Return a promise for a JSON or XML Embodiment for the given viewData.
 * Note that this function strips automatically all the data item starting with '_'
 * (undercore) since - as a convention in relax.js - these are private member variables.
*/
export function createEmbodiment( viewData: any, mimeType: string ) : Q.Promise< relaxjs.Embodiment > {
  var log = _log.child( { func: 'internals.viewJson'} );
  var later = Q.defer< relaxjs.Embodiment >();
  var resourceName = 'resource';
  log.info('Creating Embodiment as %s',mimeType);
  _.defer( () => {
    try {
      // 1 Copy the public properties and _name to a destination object for serialization.
      var destObj = {};
      _.each( _.keys( viewData) , function(key: string) {
        //
        if ( key === '_name' ) {
          destObj['name'] = viewData[key];
          resourceName = viewData[key];
        }
        else if ( key.indexOf('_') === 0 )
          return;
        else {
          //console.log('['+key+'] is '+viewData[key] );
          destObj[key] = viewData[key];
        }
      });
      // 2 - build the embodiment serializing the data as a Buffer
      // log.info('Serializing "%s"',JSON.stringify(destObj));
      var dataString = '';
      switch(mimeType) {
        case 'application/xml':
        case 'text/xml':
          var builder = new xml2js.Builder({ rootName: resourceName });
          dataString = builder.buildObject( destObj );
          break;
        case 'application/json':
        default:
          dataString = JSON.stringify( destObj );
          break;
      }
      // log.info('Delivering: "%s"',dataString);
      var e = new relaxjs.Embodiment( mimeType, new Buffer( dataString,'utf-8' ) );
      later.resolve( e );
    }
    catch( err ) {
      log.error(err);
      later.reject( new rxError.RxError('JSON Serialization error: '+err ) )
    }
  });
  return later.promise;
}

/*
 * Realize the given view (viewName) merging it with the given data (viewData)
 * It can use an embedding view layout as third argument (optional)
 * Return a promise that will return the full content of the view + the viewdata.
*/
export function viewDynamic(
    viewName: string,
    viewData: any,
    layoutName?: string ) : Q.Promise< relaxjs.Embodiment > {
  var log = _log.child( { func: 'internals.viewDynamic'} );
  var laterAct = Q.defer< relaxjs.Embodiment >();
  var readFile = Q.denodeify(fs.readFile);
  var templateFilename = './views/'+viewName+'._';
  if ( viewName === 'site') {
    templateFilename = __dirname+'/../views/'+viewName+'._';
  }
  if ( layoutName ) {
    var layoutFilename = './views/'+layoutName+'._';
    log.info('Reading template %s in layout %s',templateFilename, layoutFilename );
    Q.all( [ readFile( templateFilename,  { 'encoding':'utf8'} ),
             readFile( layoutFilename,    { 'encoding':'utf8'} ) ])
    .spread( (content: string, outerContent : string) => {
      try {
        log.info('Compile composite view %s in %s',templateFilename,layoutFilename);
        var innerContent = new Buffer( _.template(content)(viewData), 'utf-8' );
        var fullContent = new Buffer( _.template(outerContent)( { page: innerContent, name: viewData.Name }), 'utf-8');
        laterAct.resolve( new relaxjs.Embodiment( 'text/html', fullContent ));
      }
      catch( err ) {
        log.error( err );
        laterAct.reject( emitCompileViewError(content,err, templateFilename +' in '+ layoutFilename) );
      }
    })
    .catch( (err : Error ) => {
      log.error( err );
      laterAct.reject( emitCompileViewError('N/A',err, templateFilename +' in '+ layoutFilename ) );
    });
  }
  else {
    log.info('Reading template %s',templateFilename);
    readFile( templateFilename,  { 'encoding':'utf8'} )
    .then( ( content:string ) => {
      try {
        log.info( 'Compiling view %s', templateFilename );
        var fullContent = new Buffer( _.template(content)(viewData) , 'utf-8') ;
        laterAct.resolve( new relaxjs.Embodiment( 'text/html', fullContent ));
      }
      catch( err ) {
        log.error( err );
        laterAct.reject( emitCompileViewError(content,err, templateFilename ) );
      }
    })
    .catch( ( err : Error ) => {
      log.error( err );
      laterAct.reject( emitCompileViewError('N/A',err, templateFilename ) );
    });
  }
  return laterAct.promise;
}
