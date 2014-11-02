///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./relaxjs.ts' />

import _ = require("underscore");
_.str = require('underscore.string');

import relaxjs = require('./relaxjs');

/*
 * Standard node Error: type declaration
*/
declare class Error {
    public name: string;
    public message: string;
    public stack: string;
    constructor(message?: string);
}


/*
 * Extended Error information for Relax.js
*/
interface IRxError extends Error {
  httpCode: number;
  extra: string;
  getHttpCode(): number;
  getExtra(): string;
}

/*
 * Extended Error class for Relax.js
*/
export class RxError implements IRxError {
  httpCode: number;
  extra: string;
  public name: string;
  public message: string;
  public stack: string;
  constructor( message: string, name?: string, code?: number, extra?: string ) {
    var tmp = new Error();
    this.message = message;
    this.name = name;
    this.httpCode = code;
    this.stack = tmp.stack;
    this.extra = extra;
  }
  getHttpCode(): number {
    return this.httpCode;
  }
  getExtra(): string {
    return this.extra ? this.extra : '' ;
  }

  toString(): string {
    return _.str.sprintf('RxError %d: %s\n%s\nStack:\n%s',this.httpCode,this.name,this.message,this.stack);
  }
}
