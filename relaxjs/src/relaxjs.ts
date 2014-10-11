///<reference path='../typings/node/node.d.ts' />

//require('typescript-require');
// import Routing = require("./Routing"); */


export class Resource {
  constructor( private name: string ) {}
  pippo() : void {
    console.log('Resource:'+this.name);
  }
}

export class Route {
  constructor( private name: string ) {}
  paperino() : void {
    console.log('My name is:'+this.name);
  }
}
export function relax() : string {
  return 'Congratulation: this is relaxjs a node module written in Typescript';
}
