///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />

///<reference path='./internals.ts' />
///<reference path='./routing.ts' />
///<reference path='./relaxjs.ts' />

import fs = require('fs');
import Q = require('q');
import mime = require('mime');
import _ = require("underscore");
_.str = require('underscore.string');

import relaxjs = require('./relaxjs');
import routing = require('./routing');
import internals = require('./internals');

// ===================================================================================
export class Data implements relaxjs.Resource {
  constructor( public Name: string ) {}
  get( route: routing.Route )  : Q.Promise< relaxjs.Embodiment > {
    var later = Q.defer< relaxjs.Embodiment >();
    var readFile = Q.denodeify(fs.readFile);
    var dataFile = './data/'+this.Name+'.json';
    readFile( dataFile)
      .then( (content: Buffer ) => {
        later.resolve(new relaxjs.Embodiment(content, 'application/json' ));
      })
      .catch( ( err : Error ) => {
        later.reject( internals.emitCompileViewError('N/A',err, dataFile ) );
      });
    return later.promise;
  }
}

// ===================================================================================
export class HtmlView implements relaxjs.Resource {
  public Name: string = "site";

  constructor( public viewName: string, public layout?: string ) {
    this.Name = viewName;
  }

  get( route : routing.Route ) : Q.Promise< relaxjs.Embodiment > {
    var contextLog = '['+this.Name+'.get] ';
    console.log( _.str.sprintf('%s Fetching resource : [ %s ]',route.path,contextLog) );

    // Here we compute/fetch/create the view data.
    return internals.viewDynamic(this.Name,this, this.layout );
  }
}
