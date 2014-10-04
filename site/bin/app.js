///<reference path='../../typings/node/node.d.ts' />
// App specific module
var app = require("./application");

//import app = require("./micurs_com"); // specific resources for this site
var portNumber = 3000;

// Create the application by assembling the resources
var site = app.Resources.Site.$('micurs.com');
site.addResource(new app.Resources.HtmlView('home'));

// Serve the app on the network
var appSrv = site.serve();
appSrv.listen(portNumber);
