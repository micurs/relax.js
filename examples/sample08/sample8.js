///<reference path='typings/node/node.d.ts' />
///<reference path='typings/q/q.d.ts' />
///<reference path='/usr/lib/node_modules/relaxjs/dist/relaxjs.d.ts' />
var fs = require('fs');
var Q = require('q');
var relax = require('relaxjs');
// Async copy file
function _copyFile(src, dst) {
    var later = Q.defer();
    var fileStat = fs.statSync(src);
    if (fileStat.isDirectory()) {
        later.resolve(false);
    }
    else if (fileStat.isFile()) {
        var rd = fs.createReadStream(src);
        rd.on("error", function (err) { return later.reject(err); });
        var wr = fs.createWriteStream(dst);
        wr.on("error", function (err) { return later.reject(err); });
        wr.on("close", function (ex) { return later.resolve(true); });
        rd.pipe(wr);
    }
    else {
        later.resolve(false);
    }
    return later.promise;
}
// Create the application by assembling the resources
var site = relax.site('sample8');
site.add({
    name: 'upload',
    onPost: function (query, body, respond) {
        var self = this;
        console.log('multipart', JSON.stringify(body, null, '  '));
        var uploadInfo = body.files.upload[0];
        console.log('copy file', uploadInfo.path, './' + uploadInfo.originalFilename);
        _copyFile(uploadInfo.path, './' + uploadInfo.originalFilename).then(function (res) {
            self.redirect(respond, "/sample8.html?success=" + res);
        }).fail(function () { return self.fail('Upload failed'); });
        //fs.readFile('image.jpg', function (err: Error, content: Buffer) {
        //  self.ok(respond, content);
        //});
    }
});
site.setHome('/sample8.html');
// Create the application server for the site and listen on port 3000
var appSrv = site.serve().listen(3000);
