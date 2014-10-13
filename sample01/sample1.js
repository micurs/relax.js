var r = require('relaxjs');

// Create the application by assembling the resources
var site = r.site('sample1.com');

// Create the application server for the site
var appSrv = site.serve();

// Listen
appSrv.listen(3000);
