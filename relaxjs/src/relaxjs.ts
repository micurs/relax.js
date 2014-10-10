/* ///<reference path='../typings/node/node.d.ts' /> */
//require('typescript-require');



export class Resource {
  constructor( private name: string ) {}
  pippo() : void {
    console.log(this.name);
  }
}

  // export var Routing = require('./Routing');

export function relax() : string {
  return 'This is relaxjs node module';
}

/*
declare module "relaxjs" {
  export = relaxjs;
}
*/
