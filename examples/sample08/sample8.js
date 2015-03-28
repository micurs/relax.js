var fs = require('fs');
var Q = require('q');
var relax = require('relaxjs');
function _copyFile(src, dst) {
    var later = Q.defer();
    var fileStat = fs.statSync(src);
    if (fileStat.isDirectory()) {
        later.resolve(false);
    }
    else if (fileStat.isFile()) {
        var rd = fs.createReadStream(src);
        rd.on("error", function (err) {
            return later.reject(err);
        });
        var wr = fs.createWriteStream(dst);
        wr.on("error", function (err) {
            return later.reject(err);
        });
        wr.on("close", function (ex) {
            return later.resolve(true);
        });
        rd.pipe(wr);
    }
    else {
        later.resolve(false);
    }
    return later.promise;
}
var site = relax.site('sample8');
site.add({
    name: 'upload',
    onPost: function (query, body, respond) {
        var self = this;
        console.log('multipart', JSON.stringify(body, null, '  '));
        var uploadInfo = body.files.upload[0];
        console.log('copying file from:', uploadInfo.path, "to -> ./" + uploadInfo.originalFilename);
        _copyFile(uploadInfo.path, "./" + uploadInfo.originalFilename).then(function (res) {
            self.redirect(respond, "/sample8.html?success=" + res);
        }).fail(function (errMsg) {
            var respError = new relaxjs.RxError(errMsg, 'Upload failed', 404);
            respond.fail(respError);
        });
    }
});
site.setHome('/sample8.html');
site.setTempDirectory('/examples/sample08');
var appSrv = site.serve().listen(3000);
