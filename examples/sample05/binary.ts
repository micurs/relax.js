///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />

var fs = require('fs');
var relax = require('relaxjs');

// Create the application by assembling the resources
var site = relax.site('sample5');

site.add(  {
  name: 'image',
  outFormat: 'image/jpeg',
  onGet: function( query, respond ) {
    var self = this;
    fs.readFile('image.jpg', function (err: Error, content: Buffer) {
      self.data = content;
      self.headers = { 'Cache-Control' : 'no-transform,public,max-age=300,s-maxage=900' };
      respond.ok();
    });
  }
});


// Create the application server for the site and listen on port 3000
var appSrv = site.serve().listen(3000);
