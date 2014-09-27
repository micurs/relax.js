///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />

var url = require("url");

export module Routing {

  export class Route {
    isPublic : boolean = true;
  }

  export function fromUrl(request) : Route {
    return { isPublic : true };
  }
}
