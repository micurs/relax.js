///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />

var http = require("http");
var url = require("url");
var q = require('q');

import app = require("./application");

var portNumber : number = 3000;

var home = new app.resources.home("Hello World");

var appSrv = http.createServer( (request, response) => {
  console.log("Request received.");
  response.writeHead(200, {"Content-Type": "text/html"} );
  home.get()
    .then( ( content: string ) => {
      response.write(content );
      response.end();
    })
    .fail(function (error) {
      response.write(error );
      response.end();
    })
    .done();
});

appSrv.listen(portNumber);
