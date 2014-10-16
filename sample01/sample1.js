var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');
site.addResource( 'helloworld', new r.resources.HtmlView('helloworld', null, { message: "Hello World!" } ))

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
