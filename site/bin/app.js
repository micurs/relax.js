require('typescript-require');
var r = require('relaxjs');
var portNumber = 3000;
var site = r.Site.$('micurs.com');
var appSrv = site.serve(portNumber);
site.addResource(new r.resources.HtmlView('home', 'layout'));
appSrv.listen(portNumber);
