///<reference path='../typings/node/node.d.ts' />
///<reference path='../typings/underscore/underscore.d.ts' />
///<reference path='../typings/underscore.string/underscore.string.d.ts' />
///<reference path='../typings/q/Q.d.ts' />
///<reference path='../typings/mime/mime.d.ts' />
///<reference path='../node_modules/relaxjs/dist/relaxjs.d.ts' /> */
// require('typescript-require');
var r = require('relaxjs'); //
console.log(r.relax());
var p = new r.Resource('pippo');
p.pippo();
