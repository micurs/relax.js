var fs = require('fs');
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var relaxjs = require('./relaxjs');
var internals = require('./internals');
var Data = (function () {
    function Data(Name) {
        this.Name = Name;
    }
    Data.prototype.get = function (route) {
        var later = Q.defer();
        var readFile = Q.denodeify(fs.readFile);
        var dataFile = './data/' + this.Name + '.json';
        readFile(dataFile).then(function (content) {
            later.resolve(new relaxjs.Embodiment(content, 'application/json'));
        }).catch(function (err) {
            later.reject(internals.emitCompileViewError('N/A', err, dataFile));
        });
        return later.promise;
    };
    return Data;
})();
exports.Data = Data;
var HtmlView = (function () {
    function HtmlView(viewName, layout) {
        this.viewName = viewName;
        this.layout = layout;
        this.Name = "site";
        this.Name = viewName;
    }
    HtmlView.prototype.get = function (route) {
        var contextLog = '[' + this.Name + '.get] ';
        console.log(_.str.sprintf('%s Fetching resource : [ %s ]', route.path, contextLog));
        return internals.viewDynamic(this.Name, this, this.layout);
    };
    return HtmlView;
})();
exports.HtmlView = HtmlView;
