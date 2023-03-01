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
exports.organizationRouter = void 0;
const database_1 = __importDefault(require("../config/database"));
const error_1 = __importDefault(require("../config/error"));
const express_1 = __importDefault(require("express"));
const session_1 = __importDefault(require("../config/session"));
const user_1 = require("./user");
class Organization {
    constructor(db, error) {
        this.db = db;
        this.error = error;
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.checkTable("organizations");
            if (init === 0) {
                const query = `CREATE TABLE organizations (userID CHAR(50) NOT NULL PRIMARY KEY,  name CHAR(50) NOT NULL, interest CHAR(20) NOT NULL, taxID CHAR(20) NOT NULL,
                    state CHAR(20) NOT NULL, lga CHAR(20) NOT NULL, address CHAR(100) NOT NULL)`;
                return yield this.db.createTable(query);
            }
            return init == 1;
        });
    }
    check_organization(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.process("SELECT * FROM organizations WHERE userID = ?", [userID], "unable to get organization details");
            if (init) {
                const rows = init;
                return rows.length > 0;
            }
            return undefined;
        });
    }
    write(response, id, name, interest, taxID, state, lga, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const userID = yield new session_1.default(this.db, this.error).get(id);
            const user = new user_1.User(this.db, this.error);
            if (userID && (yield this.check())) {
                if (yield this.check_organization(userID)) {
                    return response.status(500).send({ messae: "organization already exist for user" });
                }
                else {
                    const init = yield this.db.process("INSERT INTO organizations SET userID = ?, name = ?, interest = ?, taxID = ?, state = ?, lga = ?, address = ?", [userID, name, interest, taxID, state, lga, address], "organization registration failed");
                    if (init && (yield user.make(userID, "organization"))) {
                        return response.status(201).send({ message: "organization registration success" });
                    }
                }
            }
        });
    }
    get(response, userID, email, phone) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("SELECT * FROM organizations WHERE userID = ?", [userID], "unable to fetch organization details");
                if (init) {
                    const rows = init;
                    if (rows && rows.length > 0) {
                        const result = rows[0];
                        return response.status(200).send({
                            email: email, verified: true, type: "organization", phone: phone,
                            account: {
                                name: result.name, interest: result.interest, taxID: result.taxID,
                                address: { state: result.state, lga: result.lga, address: result.address }
                            }
                        });
                    }
                    else {
                        return response.status(404).send({ messae: "organization details not found" });
                    }
                }
            }
            return undefined;
        });
    }
}
exports.default = Organization;
exports.organizationRouter = express_1.default.Router();
exports.organizationRouter.post("/create", (req, res) => {
    if (req.headers.authorization && req.body.name && req.body.interest && req.body.taxID && req.body.state && req.body.lga && req.body.address) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        new Organization(database, error).write(res, req.headers.authorization, req.body.name, req.body.interest, req.body.taxID, req.body.state, req.body.lga, req.body.address).then((init) => {
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
