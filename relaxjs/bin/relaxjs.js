///<reference path='../../typings/node/node.d.ts' />
///<reference path='./../../typings/underscore/underscore.d.ts' />
///<reference path='./../../typings/underscore.string/underscore.string.d.ts' />
///<reference path='./../../typings/q/Q.d.ts' />
///<reference path='./../../typings/mime/mime.d.ts' />
var _ = require("underscore");
_.str = require('underscore.string');

// Internal function to emit error/warning messages
// ------------------------------------------------------------------------------
function emitCompileViewError(content, err, filename) {
    var fname = '[view error]';
    var errTitle = _.str.sprintf('<h1>%s Error while compiling: %s </h1>', fname, filename);
    var errMsg = _.str.sprintf('<p style="font-weight:bold;">Error: <span style="color:red;">%s</span></p>', _.escape(err.message));
    var code = _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>', _.escape(content));
    return _.str.sprintf('%s%s%s', errTitle, errMsg, code);
}

// Generic route for HTTP requests
// ------------------------------------------------------------------------------
var Route = (function () {
    function Route() {
        this.static = true;
    }
    return Route;
})();
exports.Route = Route;


// Every resource is converted to their embodiment before they can be served
// ------------------------------------------------------------------------------
var Embodiment = (function () {
    function Embodiment(data, mimeType) {
        this.data = data;
        this.mimeType = mimeType;
    }
    Embodiment.prototype.serve = function (response) {
        response.writeHead(200, { 'Content-Type': this.mimeType, 'Content-Length': this.data.length });
        response.write(this.data);
        response.end();
    };
    return Embodiment;
})();
exports.Embodiment = Embodiment;
