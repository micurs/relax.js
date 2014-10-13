require('typescript-require');
var r = require('relaxjs');
var portNumber = 3000;
var site = r.Site.$('micurs.com');
var appSrv = site.serve(portNumber);
appSrv.listen(portNumber);
