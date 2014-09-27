///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />
var http = require("http");
var url = require("url");
var q = require('q');

var app = require("./application");

var portNumber = 3000;

var home = new app.resources.home("Hello World");

var appSrv = http.createServer(function (request, response) {
    console.log("Request received.");
    response.writeHead(200, { "Content-Type": "text/html" });
    home.get().then(function (content) {
        response.write(content);
        response.end();
    }).fail(function (error) {
        response.write(error);
        response.end();
    }).done();
});

appSrv.listen(portNumber);
