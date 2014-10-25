var fs = require('fs');
var mime = require('mime');
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var relaxjs = require('./relaxjs');
function emitCompileViewError(content, err, filename) {
    var fname = '[view error]';
    var errTitle = _.str.sprintf('%s Error while compiling: %s', fname, filename);
    var errMsg = err.message;
    var code = _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>', _.escape(content));
    return new relaxjs.RxError(errMsg, errTitle, 500, code);
}
exports.emitCompileViewError = emitCompileViewError;
function emitError(content, filename) {
    var fname = '[error]';
    var errTitle = _.str.sprintf('%s Error while serving: %s', fname, filename);
    var errMsg = content;
    return new relaxjs.RxError(errMsg, errTitle, 500);
}
exports.emitError = emitError;
function promiseError(msg, resName) {
    console.log(msg);
    var later = Q.defer();
    later.reject(emitError(msg, resName));
    return later.promise;
}
exports.promiseError = promiseError;
function redirect(location) {
    var later = Q.defer();
    _.defer(function () {
        var redir = new relaxjs.Embodiment('text/html');
        redir.httpCode = 307;
        redir.location = location;
        later.resolve(redir);
    });
    return later.promise;
}
exports.redirect = redirect;
function viewStatic(filename) {
    var fname = '[view static]';
    var mtype = mime.lookup(filename);
    var laterAction = Q.defer();
    var staticFile = '.' + filename;
    fs.readFile(staticFile, function (err, content) {
        if (err) {
            laterAction.reject(new relaxjs.RxError(filename + ' not found', 'File Not Found', 404));
        }
        else {
            laterAction.resolve(new relaxjs.Embodiment(mtype, content));
        }
    });
    return laterAction.promise;
}
exports.viewStatic = viewStatic;
function viewJson(viewData) {
    var later = Q.defer();
    _.defer(function () {
        var e = new relaxjs.Embodiment('application/json', new Buffer(JSON.stringify(viewData, function (key, value) { return (key.indexOf('_') === 0) ? undefined : value; }, '  '), 'utf-8'));
        later.resolve(e);
    });
    return later.promise;
}
exports.viewJson = viewJson;
function viewDynamic(viewName, viewData, layoutName) {
    var fname = '[view] ';
    var laterAct = Q.defer();
    var readFile = Q.denodeify(fs.readFile);
    var templateFilename = './views/' + viewName + '._';
    if (viewName === 'site') {
        templateFilename = __dirname + '/../views/' + viewName + '._';
    }
    if (layoutName) {
        var layoutFilename = './views/' + layoutName + '._';
        Q.all([readFile(templateFilename, { 'encoding': 'utf8' }), readFile(layoutFilename, { 'encoding': 'utf8' })]).spread(function (content, outerContent) {
            try {
                console.log(_.str.sprintf('%s Compiling composite view %s in %s', fname, layoutFilename, templateFilename));
                var innerContent = new Buffer(_.template(content)(viewData), 'utf-8');
                var fullContent = new Buffer(_.template(outerContent)({ page: innerContent, name: viewData.Name }), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment('text/html', fullContent));
            }
            catch (e) {
                laterAct.reject(emitCompileViewError(content, e, templateFilename + ' in ' + layoutFilename));
            }
        }).catch(function (err) {
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename + ' in ' + layoutFilename));
        });
    }
    else {
        readFile(templateFilename, { 'encoding': 'utf8' }).then(function (content) {
            try {
                console.log(_.str.sprintf('%s Compiling view %s', fname, templateFilename));
                var fullContent = new Buffer(_.template(content)(viewData), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment('text/html', fullContent));
            }
            catch (e) {
                laterAct.reject(emitCompileViewError(content, e, templateFilename));
            }
        }).catch(function (err) {
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename));
        });
    }
    return laterAct.promise;
}
exports.viewDynamic = viewDynamic;
//# sourceMappingURL=internals.js.map