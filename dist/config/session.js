"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __importDefault(require("../utils"));
class Session {
    constructor(db, error) {
        this.db = db;
        this.error = error;
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.checkTable("sessions");
            if (init == 0) {
                return this.db.createTable("CREATE TABLE sessions (id CHAR(50) PRIMARY KEY NOT NULL, userID CHAR(50) NOT NULL, time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
            }
            return init == 1;
        });
    }
    check_users(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.process("SELECT * FROM sessions WHERE userID = ?", [userID], "session error");
            if (init) {
                const rows = init;
                if (rows.length > 0) {
                    const result = rows[0];
                    if (this.isExpired(result.time) && (yield this.delete(userID))) {
                        return false;
                    }
                    else {
                        return true;
                    }
                }
            }
            return undefined;
        });
    }
    isExpired(time) {
        const init = new Date(Date.now().valueOf() - new Date(time).valueOf());
        const year = init.getFullYear() * 12 * 30 * 24;
        const month = init.getMonth() * 30 * 24;
        const day = init.getDate() * 24;
        const hour = init.getHours();
        const total = year + month + day + hour;
        return total > 2;
    }
    refresh(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const stmt = "Update sessions SET time = CURRENT_TIMESTAMP WHERE userID = ?";
                const init = yield this.db.process(stmt, [userID], "unable to update session");
                if (init) {
                    return true;
                }
            }
            return false;
        });
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("SELECT userID, time FROM sessions WHERE id = ?", [id], "sessions error");
                if (init) {
                    const rows = init;
                    if (rows && rows.length > 0) {
                        return rows[0].userID;
                    }
                }
                else {
                    this.error.add(404, "", "session not found or expired");
                }
            }
            return undefined;
        });
    }
    create(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = (0, utils_1.default)();
            if (yield this.check()) {
                const check_result = yield this.check_users(userID);
                if (check_result && (yield this.delete(userID))) {
                    return yield this.create(userID);
                }
                else {
                    const init = yield this.db.process("INSERT INTO sessions SET id = ?, userID = ?", [token, userID], "unable to create session");
                    if (init) {
                        return token;
                    }
                }
            }
            return undefined;
        });
    }
    delete(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("DELETE from sessions WHERE userID = ?", [userID], "unable to delete previous session");
                if (init) {
                    return true;
                }
            }
            return false;
        });
    }
}
exports.default = Session;
