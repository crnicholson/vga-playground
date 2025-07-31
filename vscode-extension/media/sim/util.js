"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeExtend = exports.byteArrayToString = void 0;
function byteArrayToString(data) {
    let str = '';
    if (data != null) {
        const charLUT = new Array();
        for (let i = 0; i < 256; ++i) {
            charLUT[i] = String.fromCharCode(i);
        }
        const len = data.length;
        for (let i = 0; i < len; i++) {
            str += charLUT[data[i]];
        }
    }
    return str;
}
exports.byteArrayToString = byteArrayToString;
// only does primitives, 1D arrays and no recursion
function safeExtend(deep, dest, src) {
    // TODO: deep ignored
    for (const key in src) {
        const val = src[key];
        const type = typeof val;
        if (val === null || type == 'undefined') {
            dest[key] = val;
        }
        else if (type == 'function') {
            // ignore function
        }
        else if (type == 'object') {
            if (val['slice']) {
                // array?
                dest[key] = val.slice();
            }
            else {
                // ignore object
            }
        }
        else {
            dest[key] = val;
        }
    }
    return dest;
}
exports.safeExtend = safeExtend;
//# sourceMappingURL=util.js.map