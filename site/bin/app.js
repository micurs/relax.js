///<reference path='./../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var relaxjs = require("./relaxjs");

//import app = require("./application");
//import controller = require("./controller"); // routing functions
//import app = require("./micurs_com"); // specific resources for this site
var portNumber = 3000;

// Create the application by assembling the resources
var site = relaxjs.Site.$('micurs.com');
site.addResource(new relaxjs.Resources.HtmlView('home', 'layout'));
site.addResource(new relaxjs.Resources.Data('resume'));

// Serve the app on the network
var appSrv = site.serve();
appSrv.listen(portNumber);
