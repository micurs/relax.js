var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');
site.add( new r.resources.HtmlView('helloworld', null, { message: "Hello World!" } ))
site.addResource( 'helloworld2', new r.resources.HtmlView('helloworld', null, { message: "Ciao Mondo!" } ))

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
