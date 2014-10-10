///<reference path="../typings/node/node.d.ts" />

class Resource {
  constructor( private name: string ) {}
  pippo() : void {
    console.log(this.name);
  }
}
