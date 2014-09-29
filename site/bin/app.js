///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./application.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
///<reference path='./../../typings/chalk/chalk.d.ts' />
// System and third party import
var http = require("http");

var mime = require('mime');
var chalk = require('chalk');

// Local import
var app = require("./application");
var controller = require("./controller");

var portNumber = 3000;

// Create the resources for the site
var home = new app.Resources.Home("Hello World");

function respondHtml(response, content) {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(content);
    response.end();
}
function respondBin(response, content, mtype) {
    response.writeHead(200, { 'Content-Type': mtype });
    response.write(content);
    response.end();
}

var appSrv = http.createServer(function (request, response) {
    console.log('Recv ' + request.url);

    // here we need to route the call to the appropriate class:
    // --------------------------------------------------------------
    // GET /home/users?id=100
    // becomes
    // home.users.get(100)
    // PUT /home/users?id=100
    // becomes
    //  home.users.put( 100, data)
    // --------------------------------------------------------------
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

console.log(chalk.red('[server]  Start listening on port 3000'));
appSrv.listen(portNumber);
