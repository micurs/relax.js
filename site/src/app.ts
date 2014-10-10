///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='../node_modules/relaxjs/dist/relaxjs.d.ts' /> */

import r = require('relaxjs'); //

console.log( r.relax() );

var p = new r.Resource('pippo');
p.pippo();


/*
var res = new relaxjs.Resources('pippo');
res.pippo();
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
