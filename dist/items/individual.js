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
exports.individualRouter = void 0;
const database_1 = __importDefault(require("../config/database"));
const error_1 = __importDefault(require("../config/error"));
const express_1 = __importDefault(require("express"));
const session_1 = __importDefault(require("../config/session"));
const user_1 = require("./user");
class Individual {
    constructor(db, error) {
        this.db = db;
        this.error = error;
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.checkTable("individuals");
            if (init === 0) {
                const query = `CREATE TABLE individuals (userID CHAR(50) NOT NULL PRIMARY KEY,  fname CHAR(20) NOT NULL, lname  CHAR(20) NOT NULL, nin CHAR(20) NOT NULL,
                    state CHAR(20) NOT NULL, lga CHAR(20) NOT NULL, address CHAR(100) NOT NULL)`;
                return this.db.createTable(query);
            }
            return init == 1;
        });
    }
    check_individual(userID) {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.process("SELECT * FROM individuals WHERE userID = ?", [userID], "unable to get individual details");
            if (init) {
                const rows = init;
                return rows.length > 0;
            }
            return undefined;
        });
    }
    write(response, id, fname, lname, nin, state, lga, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const userID = yield new session_1.default(this.db, this.error).get(id);
            const user = new user_1.User(this.db, this.error);
            if (userID && (yield this.check())) {
                if (yield this.check_individual(userID)) {
                    return response.status(500).send({ messae: "destails already exist for user" });
                }
                else {
                    const init = yield this.db.process("INSERT INTO individuals SET userID = ?, fname = ?, lname = ?, nin = ?, state = ?, lga = ?, address = ?", [userID, fname, lname, nin, state, lga, address], "user details registration failed");
                    if (init && (yield user.make(userID, "individual"))) {
                        return response.status(201).send({ message: "user details registration success" });
                    }
                }
            }
            return undefined;
        });
    }
    get(response, userID, email, phone) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("SELECT * FROM individuals WHERE userID = ?", [userID], "unable to fetch user details");
                if (init) {
                    const rows = init;
                    if (rows && rows.length > 0) {
                        const result = rows[0];
                        return response.status(200).send({
                            email: email, verified: true, type: "individual", phone: phone,
                            account: {
                                fname: result.fname, lname: result.lname, nin: result.nin,
                                address: { state: result.state, lga: result.lga, address: result.address }
                            }
                        });
                    }
                    else {
                        return response.status(404).send({ messae: "user details not found" });
                    }
                }
            }
            return undefined;
        });
    }
}
exports.default = Individual;
exports.individualRouter = express_1.default.Router();
exports.individualRouter.post("/create", (req, res) => {
    if (req.headers.authorization && req.body.fname && req.body.lname && req.body.nin && req.body.state && req.body.lga && req.body.address) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        const individual = new Individual(database, error);
        individual.write(res, req.headers.authorization, req.body.fname, req.body.lname, req.body.nin, req.body.state, req.body.lga, req.body.address).then((init) => {
            if (init === undefined && error.has_error()) {
                return error.display(res);
            }
            else {
                return init;
            }
        });
    }
    else {
        res.status(500).send({ message: "invalid request to server" });
    }
});
