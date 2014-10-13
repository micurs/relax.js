///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

//require('typescript-require');
import r = require('relaxjs');

// Create the application by assembling the resources
var site = r.Site.$('micurs.com');

// Create the application by assembling the resources
var appSrv = site.serve();
site.addResource( new r.resources.HtmlView('home','layout'));
site.addResource( new relaxjs.Resources.Data('resume'));

appSrv.listen(3000);
