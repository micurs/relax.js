var fs = require('fs');
var mime = require('mime');
var Q = require('q');
var querystring = require('querystring');
var bunyan = require('bunyan');
var _ = require("lodash");
var relaxjs = require('./relaxjs');
var rxError = require('./rxerror');
var _log;
var _appName;
function setLogVerbose(flag) {
    _log.level(bunyan.INFO);
}
exports.setLogVerbose = setLogVerbose;
function initLog(appName) {
    _appName = appName;
    _log = bunyan.createLogger({ name: appName });
    _log.level(bunyan.WARN);
}
exports.initLog = initLog;
function log() {
    if (!_log) {
        _log = bunyan.createLogger({ name: 'no app' });
        _log.level(bunyan.WARN);
    }
    return _log;
}
exports.log = log;
function format(source) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return this.replace(/{(\d+)}/g, function (match, n) {
        return typeof args[n] != 'undefined' ? args[n] : match;
    });
}
exports.format = format;
function slugify(source) {
    var res = source.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    return res;
}
exports.slugify = slugify;
function parseData(bodyData, contentType) {
    try {
        if (contentType.indexOf('application/json') > -1) {
            return JSON.parse(bodyData);
        }
        else
            return querystring.parse(bodyData);
    }
    catch (err) {
        _log.error('Error parsing incoming data with %s', contentType);
        _log.error(err);
        return {};
    }
}
exports.parseData = parseData;
function emitCompileViewError(content, err, filename) {
    var errTitle = '[error] Compiling View: %s' + filename;
    var errMsg = err.message;
    var code = format('<h4>Content being compiled</h4><pre>{0}</pre>', _.escape(content));
    _log.error(errTitle);
    return new rxError.RxError(errMsg, errTitle, 500, code);
}
exports.emitCompileViewError = emitCompileViewError;
function emitError(content, resname) {
    var errTitle = format('[error.500] Serving: {0}', resname);
    var errMsg = content;
    _log.error(errTitle);
    return new rxError.RxError(errMsg, errTitle, 500);
}
exports.emitError = emitError;
function promiseError(msg, resName) {
    var later = Q.defer();
    _.defer(function () {
        _log.error(msg);
        later.reject(emitError(msg, resName));
    });
    return later.promise;
}
exports.promiseError = promiseError;
function redirect(location) {
    var later = Q.defer();
    _.defer(function () {
        _log.info('Sending a Redirect 307 towards %s', location);
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
    var log = _log.child({ func: 'internals.viewStatic' });
    var mtype = mime.lookup(filename);
    var laterAction = Q.defer();
    var staticFile = '.' + filename;
    log.info('serving %s %s', fname, staticFile);
    fs.readFile(staticFile, function (err, content) {
        if (err) {
            log.warn('%s file "%s" not found', fname, staticFile);
            laterAction.reject(new rxError.RxError(filename + ' not found', 'File Not Found', 404));
        }
        else {
            laterAction.resolve(new relaxjs.Embodiment(mtype, content));
        }
    });
    return laterAction.promise;
}
exports.viewStatic = viewStatic;
function viewJson(viewData) {
    var log = _log.child({ func: 'internals.viewJson' });
    var later = Q.defer();
    _.defer(function () {
        try {
            var destObj = {};
            _.each(_.keys(viewData), function (key) {
                if (key === '_name')
                    destObj['name'] = viewData[key];
                else if (key.indexOf('_') === 0)
                    return;
                else {
                    destObj[key] = viewData[key];
                }
            });
            var e = new relaxjs.Embodiment('application/json', new Buffer(JSON.stringify(destObj), 'utf-8'));
            later.resolve(e);
        }
        catch (err) {
            log.error(err);
            later.reject(new rxError.RxError('JSON Serialization error: ' + err));
        }
    });
    return later.promise;
}
exports.viewJson = viewJson;
function viewDynamic(viewName, viewData, layoutName) {
    var log = _log.child({ func: 'internals.viewDynamic' });
    var laterAct = Q.defer();
    var readFile = Q.denodeify(fs.readFile);
    var templateFilename = './views/' + viewName + '._';
    if (viewName === 'site') {
        templateFilename = __dirname + '/../views/' + viewName + '._';
    }
    if (layoutName) {
        var layoutFilename = './views/' + layoutName + '._';
        log.info('Reading template %s in layout %s', templateFilename, layoutFilename);
        Q.all([readFile(templateFilename, { 'encoding': 'utf8' }), readFile(layoutFilename, { 'encoding': 'utf8' })]).spread(function (content, outerContent) {
            try {
                log.info('Compile composite view %s in %s', templateFilename, layoutFilename);
                var innerContent = new Buffer(_.template(content)(viewData), 'utf-8');
                var fullContent = new Buffer(_.template(outerContent)({ page: innerContent, name: viewData.Name }), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment('text/html', fullContent));
            }
            catch (err) {
                log.error(err);
                laterAct.reject(emitCompileViewError(content, err, templateFilename + ' in ' + layoutFilename));
            }
        }).catch(function (err) {
            log.error(err);
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename + ' in ' + layoutFilename));
        });
    }
    else {
        log.info('Reading template %s', templateFilename);
        readFile(templateFilename, { 'encoding': 'utf8' }).then(function (content) {
            try {
                log.info('Compiling view %s', templateFilename);
                var fullContent = new Buffer(_.template(content)(viewData), 'utf-8');
                laterAct.resolve(new relaxjs.Embodiment('text/html', fullContent));
            }
            catch (err) {
                log.error(err);
                laterAct.reject(emitCompileViewError(content, err, templateFilename));
            }
        }).catch(function (err) {
            log.error(err);
            laterAct.reject(emitCompileViewError('N/A', err, templateFilename));
        });
    }
    return laterAct.promise;
}
exports.viewDynamic = viewDynamic;
//# sourceMappingURL=internals.js.map