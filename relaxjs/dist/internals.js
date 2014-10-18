var fs = require('fs');
var mime = require('mime');
var Q = require('q');
var _ = require("underscore");
_.str = require('underscore.string');
var relaxjs = require('./relaxjs');
function emitCompileViewError(content, err, filename) {
    var fname = '[view error]';
    var errTitle = _.str.sprintf('<h1>%s Error while compiling: %s </h1>', fname, filename);
    var errMsg = _.str.sprintf('<p style="font-weight:bold;">Error: <span style="color:red;">%s</span></p>', _.escape(err.message));
    var code = _.str.sprintf('<h4>Content being compiled</h4><pre>%s</pre>', _.escape(content));
    return _.str.sprintf('%s%s%s', errTitle, errMsg, code);
}
exports.emitCompileViewError = emitCompileViewError;
function viewStatic(filename) {
    var fname = '[view static]';
    var mtype = mime.lookup(filename);
    var laterAction = Q.defer();
    var staticFile = '.' + filename;
    fs.readFile(staticFile, function (err, content) {
        if (err) {
            laterAction.reject(filename + ' not found');
        }
        else {
            laterAction.resolve(new relaxjs.Embodiment(content, mtype));
        }
    });
    return laterAction.promise;
}
exports.viewStatic = viewStatic;
function viewDynamic(viewName, viewData, layoutName) {
    var fname = '[view] ';
    var laterAct = Q.defer();
    var readFile = Q.denodeify(fs.readFile);
    var templateFilename = './views/' + viewName + '._';
    if (viewName == 'site') {
        templateFilename = __dirname + '/../views/' + viewName + '._';
    }
    if (layoutName) {
        console.log(_.str.sprintf('%s Using Layout "%s"', fname, layoutName));
        var layoutFilename = './views/_' + layoutName + '._';
        Q.all([readFile(templateFilename, { 'encoding': 'utf8' }), readFile(layoutFilename, { 'encoding': 'utf8' })]).spread(function (content, outerContent) {
            try {
                console.log(_.str.sprintf('%s Compiling composite view %s in %s', fname, layoutFilename, templateFilename));
                var innerContent = new Buffer(_.template(content)(viewData), 'utf-8');
                var fullContent = new Buffer(_.template(outerContent)({ page: innerContent, name: viewData.Name }), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment(fullContent, 'utf-8'));
            }
            catch (e) {
                laterAct.reject(emitCompileViewError(content, e, templateFilename + ' in ' + layoutFilename));
            }
        }).catch(function (err) {
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename + ' in ' + layoutFilename));
        });
    }
    else {
        console.log(_.str.sprintf('%s Using View "%s"', fname, templateFilename));
        readFile(templateFilename, { 'encoding': 'utf8' }).then(function (content) {
            try {
                console.log(_.str.sprintf('%s Compiling view %s', fname, templateFilename));
                var fullContent = new Buffer(_.template(content)(viewData), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment(fullContent, 'utf-8'));
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
