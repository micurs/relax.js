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
    Data.prototype.setName = function (newName) {
        this._name = newName;
    };
    Data.prototype.get = function (route) {
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
    Data.prototype.post = function (route) {
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
    function HtmlView(viewName, layout, moredata) {
        this._resources = {};
        this._name = '';
        this._template = '';
        this._name = viewName;
        this._template = viewName;
        this._layout = layout;
        if (moredata)
            for (var attrname in moredata) {
                this[attrname] = moredata[attrname];
            }
    }
    HtmlView.prototype.name = function () {
        return this._name;
    };
    HtmlView.prototype.setName = function (newName) {
        this._name = newName;
    };
    HtmlView.prototype.get = function (route) {
        var contextLog = _.str.sprintf('[HtmlView.%s] get', this._template);
        console.log(_.str.sprintf('%s Fetching resource : "%s"', contextLog, route.path));
        return internals.viewDynamic(this._template, this, this._layout);
    };
    HtmlView.prototype.post = function (route) {
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
