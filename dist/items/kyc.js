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
exports.kycRouter = void 0;
const database_1 = __importDefault(require("../config/database"));
const error_1 = __importDefault(require("../config/error"));
const express_1 = __importDefault(require("express"));
const session_1 = __importDefault(require("../config/session"));
class KYC {
    constructor(db, error) {
        this.db = db;
        this.error = error;
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.checkTable("kyc");
            if (init === 0) {
                const query = `CREATE TABLE kyc (userID CHAR(50) NOT NULL PRIMARY KEY,  bank_name CHAR(20) NOT NULL, bank_account CHAR(20) NOT NULL, bvn CHAR(20) NOT NULL,
                    bank_account_name CHAR(20) NOT NULL)`;
                return yield this.db.createTable(query);
            }
            return init == 1;
        });
    }
    check_kyc(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.process("SELECT * FROM kyc WHERE userID = ?", [userID], "unable to get organization details");
            if (init) {
                const rows = init;
                return rows.length > 0;
            }
            return undefined;
        });
    }
    write(response, id, bank_name, bank_account, bank_account_name, bvn) {
        return __awaiter(this, void 0, void 0, function* () {
            const userID = yield new session_1.default(this.db, this.error).get(id);
            if (userID && (yield this.check())) {
                if (yield this.check_kyc(userID)) {
                    return response.status(500).send({ messae: "kyc details already exist for user" });
                }
                else {
                    const init = yield this.db.process("INSERT INTO kyc SET userID = ?, bank_name = ?, bank_account = ?, bvn = ?, bank_account_name = ?", [userID, bank_name, bank_account, bvn, bank_account_name], "kyc registration failed");
                    if (init) {
                        return response.status(201).send({ message: "kyc registration success" });
                    }
                }
            }
        });
    }
    get(response, userID) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("SELECT * FROM kyc WHERE userID = ?", [userID], "unable to fetch kyc details");
                if (init) {
                    const rows = init;
                    if (rows && rows.length > 0) {
                        const result = rows[0];
                        return response.status(200).send({ bank_name: result.bank_name, bank_account: result.bank_account, bank_account_name: result.bank_account_name, bvn: result.bvn });
                    }
                    else {
                        return response.status(404).send({ messae: "kyc details not found" });
                    }
                }
            }
            return undefined;
        });
    }
}
exports.default = KYC;
exports.kycRouter = express_1.default.Router();
exports.kycRouter.post("/create", (req, res) => {
    if (req.headers.authorization && req.body.bank_name && req.body.bank_account && req.body.bank_account_name && req.body.bvn) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        new KYC(database, error).write(res, req.headers.authorization, req.body.bank_name, req.body.bank_account, req.body.bank_account_name, req.body.bvn).then((init) => {
            if (init === undefined || error.has_error()) {
                return error.display(res);
            }
            return init;
        });
    }
    else {
        return res.status(500).send({ message: "invalid request to server" });
    }
});
