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
  private _resources:relaxjs.ResourceMap = {};
  private _name:string = '';

  constructor( name: string ) { this._name = name; }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get( route: routing.Route ) : Q.Promise< relaxjs.Embodiment > {
    // <todo>return child resource if specified in the path</todo>

    // Here we return the embodiment of the data representing this resource.
    var later = Q.defer< relaxjs.Embodiment >();
    var readFile = Q.denodeify(fs.readFile);
    var dataFile = './data/'+this.name()+'.json';
    readFile( dataFile)
      .then( (content: Buffer ) => {
        later.resolve(new relaxjs.Embodiment(content, 'application/json' ));
      })
      .catch( ( err : Error ) => {
        later.reject( internals.emitCompileViewError('N/A',err, dataFile ) );
      });
    return later.promise;
  }
  post( route: routing.Route  ) : Q.Promise< relaxjs.Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< relaxjs.Embodiment >();
    return laterAction.promise;
  }


  addResource( res : relaxjs.Resource ) : boolean {
    return false;
  }
}

// ===================================================================================
export class HtmlView implements relaxjs.Resource {
  private _resources:relaxjs.ResourceMap = {};
  private _name: string = '';
  private _template: string = '';
  private _layout: string;


  constructor( viewName: string, layout?: string, moredata?: any ) {
    this._name = viewName;
    this._template = viewName;
    this._layout = layout;
    if ( moredata )
      for (var attrname in moredata) { this[attrname] = moredata[attrname]; }
  }

  name(): string { return this._name; }
  setName( newName:string ) : void { this._name = newName; }

  get(  route: routing.Route  ) : Q.Promise< relaxjs.Embodiment > {
    var contextLog = _.str.sprintf('[HtmlView.%s] get',this._template );
    console.log( _.str.sprintf('%s Fetching resource : "%s"',contextLog,route.path) );
    // <todo>return child resource if specified in the path</todo>

    // Here we compute/fetch/create the view data.
    return internals.viewDynamic(this._template, this, this._layout );
  }

  post( route: routing.Route  ) : Q.Promise< relaxjs.Embodiment > {
    var contextLog = '['+this.name()+'.get] ';
    var laterAction = Q.defer< relaxjs.Embodiment >();
    return laterAction.promise;
  }

  addResource( res : relaxjs.Resource ) : boolean {
    return false;
  }
}
