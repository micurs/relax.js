///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var http = require("http");

var mime = require('mime');

// App specific module
var app = require("./application");
var controller = require("./controller");

//import app = require("./micurs_com"); // specific resources for this site
var portNumber = 3000;

var home = new app.Resources.Home("Hello World");

function respondHtml(response, content) {
    response.writeHead(200, { "Content-Type": "text/html", 'Content-Length': Buffer.byteLength(content, 'utf8') });
    response.write(content);
    response.end();
}
function respondBin(response, content, mtype) {
    response.writeHead(200, { 'Content-Type': mtype, 'Content-Length': content.length });
    response.write(content);
    response.end();
}

var appSrv = http.createServer(function (request, response) {
    console.log('Recv ' + request.url);

    // here we need to route the call to the appropriate class:
    var route = controller.Routing.fromUrl(request);

    if (route.isPublic) {
        var mtype = mime.lookup(route.pathname);
        app.Resources.get(route.pathname).then(function (content) {
            respondBin(response, content, mtype);
        });
    } else {
        home.get().then(function (content) {
            respondHtml(response, content);
        }).fail(function (error) {
            response.writeHead(404, { "Content-Type": "text/html" });
            response.write(error);
            response.end();
        }).done();
    }
});

appSrv.listen(portNumber);
