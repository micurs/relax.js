var internals = require('./internals');
var RxError = (function () {
    function RxError(message, name, code, extra) {
        var tmp = new Error();
        this.message = message;
        this.name = name;
        this.httpCode = code ? code : 500;
        this.stack = tmp.stack;
        this.extra = extra;
    }
    RxError.prototype.getHttpCode = function () {
        return this.httpCode;
    };
    RxError.prototype.getExtra = function () {
        return this.extra ? this.extra : '';
    };
    RxError.prototype.toString = function () {
        return internals.format('RxError {0}: {1}\n{2}\nStack:\n{3}', this.httpCode, this.name, this.message, this.stack);
    };
    return RxError;
})();
exports.RxError = RxError;
//# sourceMappingURL=rxerror.js.map