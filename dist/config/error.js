"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorHandler {
    constructor() {
        this.errors = new Map();
    }
    add(code, error, message) {
        var _a;
        const init = { error: error, message: message };
        if (this.errors.has(code)) {
            (_a = this.errors.get(code)) === null || _a === void 0 ? void 0 : _a.push(init);
        }
        else {
            this.errors.set(code, [init]);
        }
    }
    display(response) {
        this.errors.forEach((values, code) => {
            values.forEach((value) => {
                return response.status(code).json({ "message": value.message });
            });
        });
        return response.status(500).json({ "message": "obsolute server breakdown" });
    }
    has_error() {
        return this.errors.size > 0;
    }
}
exports.default = ErrorHandler;
