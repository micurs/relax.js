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

var home = new app.Resources.Home("Hello World");

function respondHtml( response: http.ServerResponse, content : string ) {
  response.writeHead( 200, {"Content-Type": "text/html" , 'Content-Length': Buffer.byteLength(content, 'utf8') } );
  response.write(content);
  response.end();
}
function respondBin( response: http.ServerResponse, content : Buffer, mtype: string ) {
  response.writeHead(200, { 'Content-Type' : mtype, 'Content-Length': content.length } );
  response.write(content);
  response.end();
}

var appSrv = http.createServer( (request, response) => {
  console.log('Recv '+request.url);
  // here we need to route the call to the appropriate class:
  var route : controller.Routing.Route = controller.Routing.fromUrl(request);

  if ( route.isPublic ) {
    var mtype = mime.lookup(route.pathname);
    app.Resources.get( route.pathname )
    .then( (content : Buffer ) => { respondBin(response,content, mtype ); } )
  }
  else
  {
    home.get()
      .then( ( content: string ) => { respondHtml(response,content); } )
      .fail(function (error) {
        response.writeHead(404, {"Content-Type": "text/html"} );
        response.write(error);
        response.end();
      })
      .done();
  }
});

appSrv.listen(portNumber);
