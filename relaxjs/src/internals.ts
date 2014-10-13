///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./relaxjs.ts' />

import fs = require('fs');
import mime = require('mime');
import Q = require('q');

import relaxjs = require('./relaxjs');

// Internal function to emit error/warning messages
// ------------------------------------------------------------------------------
export function emitCompileViewError( content: string, err: TypeError, filename: string ) : string {
  var fname = '[view error]';
  var errTitle = _.str.sprintf('<h1>%s Error while compiling: %s </h1>',fname, filename );
  var errMsg = _.str.sprintf('<p style="font-weight:bold;">Error: <span style="color:red;">%s</span></p>',_.escape(err.message) );
  var code =  _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>',_.escape(content));
  return _.str.sprintf('%s%s%s',errTitle,errMsg,code);
}


// Realize a view from a generic get for a static file
// Return a promise that will return the full content of the view.
// -------------------------------------------------------------------------------
export function viewStatic( filename: string ) : Q.Promise< relaxjs.Embodiment > {
  var fname = '[view static]';
  var mtype = mime.lookup(filename);
  var laterAction = Q.defer< relaxjs.Embodiment >();
  var staticFile = '.'+filename;
  console.log( _.str.sprintf('%s %s',fname,staticFile) );
  fs.readFile( staticFile, function( err : Error, content : Buffer ) {
    if ( err )
      laterAction.reject( filename + ' not found');
    else
      laterAction.resolve( new relaxjs.Embodiment( content, mtype ) );
  });
  return laterAction.promise;
}

// Realize the given view (viewName) merging it with the given data (viewData)
// It can use an embedding view layout as third argument (optional)
// Return a promise that will return the full content of the view + the viewdata.
// -------------------------------------------------------------------------------
export function viewDynamic( viewName: string,
                      viewData: any,
                      layoutName?: string ) : Q.Promise< relaxjs.Embodiment > {
  var fname = '[view]';
  var readFile = Q.denodeify(fs.readFile);
  var laterAct = Q.defer< relaxjs.Embodiment >();
  var templateFilename = './views/'+viewName+'._';
  if ( layoutName !== undefined ) {
    var layoutFilename = './views/_'+layoutName+'._';
    Q.all( [ readFile( templateFilename,  { 'encoding':'utf8'} ), readFile( layoutFilename,  { 'encoding':'utf8'} ) ])
    .spread( ( content: string, outerContent : string) => {
      try {
        console.log(_.str.sprintf('%s Compiling composite view %s in %s',fname,layoutFilename,templateFilename));
        var innerContent = new Buffer( _.template(content)(viewData), 'utf-8' );
        var fullContent = new Buffer( _.template(outerContent)( { page: innerContent, name: viewData.Name }), 'utf-8');
        laterAct.resolve( new relaxjs.Embodiment( fullContent, 'utf-8' ));
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
        laterAct.resolve( new relaxjs.Embodiment( fullContent, 'utf-8' ));
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
