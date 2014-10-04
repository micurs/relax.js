///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var http = require("http");

// App specific module
var app = require("./application");
var controller = require("./controller");

//import app = require("./micurs_com"); // specific resources for this site
var portNumber = 3000;

var site = app.Resources.Site.$('micurs.com');
site.addResource(new app.Resources.HtmlView('home'));

function respond(response, content, mtype) {
    response.writeHead(200, { 'Content-Type': mtype, 'Content-Length': content.length });
    response.write(content);
    response.end();
}

var appSrv = http.createServer(function (request, response) {
    console.log('\n========================');
    console.log('Received request for :' + request.url);

    // here we need to route the call to the appropriate class:
    var route = controller.Routing.fromUrl(request);

    site.get(route).then(function (rep) {
        respond(response, rep.data, rep.mimeType);
    }).fail(function (error) {
        response.writeHead(404, { "Content-Type": "text/html" });
        response.write(error);
        response.end();
    }).done();
});

appSrv.listen(portNumber);
