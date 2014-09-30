///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />

import http = require("http");
import q = require('q');
import mime = require('mime');

// App specific module
import app = require("./application");
import controller = require("./controller"); // routing functions
//import app = require("./micurs_com"); // specific resources for this site

var portNumber : number = 3000;

var site = app.Resources.Site.$();

// var home = new app.Resources.Home("Hello World");
/*
function respondHtml( response: http.ServerResponse, content : string ) {
  response.writeHead( 200, {"Content-Type": "text/html" , 'Content-Length': Buffer.byteLength(content, 'utf8') } );
  response.write(content);
  response.end();
}*/

function respond( response: http.ServerResponse, content : Buffer, mtype: string ) {
  response.writeHead(200, { 'Content-Type' : mtype, 'Content-Length': content.length } );
  response.write(content);
  response.end();
}

var appSrv = http.createServer( (request, response) => {
  console.log('\n========================');
  console.log('Received request for :'+request.url);
  // here we need to route the call to the appropriate class:
  var route : controller.Routing.Route = controller.Routing.fromUrl(request);

  site.get( route )
    .then( ( rep : app.Resources.Embodiment ) => {
      respond(response, rep.data, rep.mimeType );
    })
    .fail(function (error) {
      response.writeHead(404, {"Content-Type": "text/html"} );
      response.write(error);
      response.end();
    })
    .done();

});

appSrv.listen(portNumber);
