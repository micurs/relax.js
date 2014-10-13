///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/Q.d.ts' />
///<reference path='typings/underscore/underscore.d.ts' />
///<reference path='typings/underscore.string/underscore.string.d.ts' />

///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

import relaxjs = require('relaxjs');


// Create a Resource class
class Users implements relaxjs.Resource {
  private _resources:relaxjs.ResourceMap = {};
  private _name:string = 'users';

  constructor() {
  }

  name(): string { return this._name; }
  get( route : relaxjs.routing.Route ) : Q.Promise<relaxjs.Embodiment> {
    var later = Q.defer< relaxjs.Embodiment >();
    return later.promise;
  }
  addResource( res : relaxjs.Resource ) : boolean {
    return false;
  }

}

class User implements relaxjs.Resource {
  private _name:string = 'N/A';
  constructor( private firstName: string, private lastName: string ) {
    this._name = _.str.sprintf('%s %s',firstName,lastName);
  }

  name(): string { return this._name; }
  get( route : relaxjs.routing.Route ) : Q.Promise<relaxjs.Embodiment> {
    var later = Q.defer< relaxjs.Embodiment >();
    return later.promise;
  }
  addResource( res : relaxjs.Resource ) : boolean {
    return false;
  }
}

// Create the application by assembling the resources
var mysite = relaxjs.site('micurs.com');

// Create the application by assembling the resources
mysite.addResource( new relaxjs.resources.HtmlView('home','layout'));

var myusers = new Users();
myusers.addResource( new User('John','Smith'));
myusers.addResource( new User('Joe','Doe'));
myusers.addResource( new User('Mary','Linn'));
myusers.addResource( new User('Tracy','Stwart'));
mysite.addResource( myusers );

var appSrv = mysite.serve();

appSrv.listen(3000);
