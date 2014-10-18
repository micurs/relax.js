var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');
site.add( new r.DynamicHtml('helloworld', null, { message: "Hello World!" } ));
site.add( new r.DynamicHtml('helloworld', null, { message: "Asta la vista!" } ));
site.addResource( 'Hello', new r.DynamicHtml('helloworld', null, { message: "Ciao Mondo!" } ));

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
