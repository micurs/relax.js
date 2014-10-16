var fs = require('fs');
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var relaxjs = require('./relaxjs');
var internals = require('./internals');
var Data = (function () {
    function Data(name) {
        this._resources = {};
        this._name = '';
        this._name = name;
    }
    Data.prototype.name = function () {
        return this._name;
    };
    Data.prototype.get = function (rxReq) {
        var later = Q.defer();
        var readFile = Q.denodeify(fs.readFile);
        var dataFile = './data/' + this.name() + '.json';
        readFile(dataFile).then(function (content) {
            later.resolve(new relaxjs.Embodiment(content, 'application/json'));
        }).catch(function (err) {
            later.reject(internals.emitCompileViewError('N/A', err, dataFile));
        });
        return later.promise;
    };
    Data.prototype.post = function (req) {
        var contextLog = '[' + this.name() + '.get] ';
        var laterAction = Q.defer();
        return laterAction.promise;
    };
    Data.prototype.addResource = function (res) {
        return false;
    };
    return Data;
})();
exports.Data = Data;
var HtmlView = (function () {
    function HtmlView(viewName, layout) {
        this.viewName = viewName;
        this.layout = layout;
        this._resources = {};
        this._name = '';
        this._name = viewName;
    }
    HtmlView.prototype.name = function () {
        return this._name;
    };
    HtmlView.prototype.get = function (rxReq) {
        var contextLog = _.str.sprintf('[%s] ', this.name());
        console.log(_.str.sprintf('%s Fetching resource : [ %s ]', rxReq.route.path, contextLog));
        return internals.viewDynamic(this.name(), this, this.layout);
    };
    HtmlView.prototype.post = function (req) {
        var contextLog = '[' + this.name() + '.get] ';
        var laterAction = Q.defer();
        return laterAction.promise;
    };
    HtmlView.prototype.addResource = function (res) {
        return false;
    };
    return HtmlView;
})();
exports.HtmlView = HtmlView;
