"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function uuid() {
    var h = '0123456789abcdef';
    var k = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    /* same as e4() below */
    var u = '', i = 0, rb = Math.random() * 0xffffffff | 0;
    while (i++ < 36) {
        var c = k[i - 1], r = rb & 0xf, v = c == 'x' ? r : (r & 0x3 | 0x8);
        u += (c == '-' || c == '4') ? c : h[v];
        rb = i % 8 == 0 ? Math.random() * 0xffffffff | 0 : rb >> 4;
    }
    return u;
}
exports.default = uuid;
