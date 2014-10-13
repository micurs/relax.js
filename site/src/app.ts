///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/q/Q.d.ts' />

/*
  ///<reference path='../typings/underscore/underscore.d.ts' />
  ///<reference path='../typings/underscore.string/underscore.string.d.ts' />
  ///<reference path='../typings/mime/mime.d.ts' />
*/
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />/

// import Q = require('q');
// import http = require("http");
// import url = require('url');

require('typescript-require');
import r = require('relaxjs');

var portNumber : number = 3000;

// console.log( r.relax() );

// Create the application by assembling the resources
var site = r.Site.$('micurs.com');


// Serve the app on the network
var appSrv = site.serve(portNumber);
//site.addResource( new r.resources.HtmlView('home','layout'));

appSrv.listen(portNumber);

/*
console.log( r.relax() );

var p = new r.Resource('pippo');
p.pippo();

var c = new r.Route('paperino');
c.paperino();

r.internals.internalsPippo();
*/


/*
// App specific module
import Q = require('q');
import relaxjs = require("./relaxjs");

//import app = require("./application");
//import controller = require("./controller"); // routing functions
//import app = require("./micurs_com"); // specific resources for this site

var portNumber : number = 3000;


// Create the application by assembling the resources
var site = relaxjs.Site.$('micurs.com');
site.addResource( new relaxjs.Resources.HtmlView('home','layout'));
site.addResource( new relaxjs.Resources.Data('resume'));

// Serve the app on the network
var appSrv = site.serve();
appSrv.listen(portNumber);
*/
