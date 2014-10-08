///<reference path='../../typings/node/node.d.ts' />
/* ///<reference path='../../relaxjs/bin/relaxjs.d.ts' /> */
// App specific module
// import relax = require("./../../relaxjs/src/relaxjs");
//import app = require("./application");
//import controller = require("./controller"); // routing functions
//import app = require("./micurs_com"); // specific resources for this site
var portNumber = 3000;

// Create the application by assembling the resources
var site = app.Resources.Site.$('micurs.com');
site.addResource(new app.Resources.HtmlView('home', 'layout'));
site.addResource(new app.Resources.Data('resume'));

// Serve the app on the network
var appSrv = site.serve();
appSrv.listen(portNumber);
