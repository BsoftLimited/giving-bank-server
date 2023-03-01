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
exports.userRouter = exports.User = void 0;
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const error_1 = __importDefault(require("../config/error"));
const session_1 = __importDefault(require("../config/session"));
const utils_1 = __importDefault(require("../utils"));
const individual_1 = __importDefault(require("./individual"));
const organization_1 = __importDefault(require("./organization"));
class User {
    constructor(db, error) {
        this.db = db;
        this.error = error;
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.checkTable("users");
            if (init === 0) {
                return this.db.createTable(`CREATE TABLE users (id CHAR(50) NOT NULL PRIMARY KEY, email CHAR(50) NOT NULL, phone CHAR(50) NOT NULL, password CHAR(20) NOT NULL, type CHAR(50) NOT NULL DEFAULT 'unknown', verified CHAR(20) NOT NULL DEFAULT 'false')`);
            }
            return init == 1;
        });
    }
    check_users(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const init = yield this.db.process("SELECT * FROM users WHERE email = ?", [email], "user checking error");
            if (init) {
                const rows = init;
                return rows.length > 0;
            }
            return undefined;
        });
    }
    write(response, email, phone, password) {
        return __awaiter(this, void 0, void 0, function* () {
            let userID = (0, utils_1.default)();
            try {
                if (yield this.check()) {
                    if (yield this.check_users(email)) {
                        return response.status(500).send({ message: "user with the same email already exists" });
                    }
                    else {
                        const init = yield this.db.process("INSERT INTO users SET id = ?, email = ?, phone = ?, password = ?", [userID, email, phone, password], "user registration failed");
                        if (init) {
                            const session = new session_1.default(this.db, this.error);
                            const id = yield session.create(userID);
                            if (id) {
                                return response.status(201).send({ id: id, email: email, phone: phone, type: "unknown", verified: false });
                            }
                            else {
                                return response.status(500).send({ message: "session creation failed, but registrated succesfully, try login in" });
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.log(error);
            }
            return response.status(500).send({ message: "unknown server errror" });
        });
    }
    make(userID, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (yield this.check()) {
                    const init = yield this.db.process("UPDATE users SET type = ? WHERE id = ?", [type, userID], "unable to update user details");
                    if (init) {
                        return true;
                    }
                }
            }
            catch (error) {
                console.log(error);
            }
            return false;
        });
    }
    login(response, email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const init = yield this.db.process("SELECT * FROM users WHERE email = ?", [email], "email or user does not exits");
                if (init) {
                    const rows = init;
                    if (rows && rows.length > 0) {
                        const result = rows[0];
                        if (result.password === password) {
                            const session = new session_1.default(this.db, this.error);
                            const id = yield session.create(result.id);
                            if (id) {
                                return response.status(200).send({ id: id, email: email, phone: result.phone, type: result.type, verified: result.verified });
                            }
                        }
                        else {
                            return response.status(400).send({ messae: "incorrect password, please try again" });
                        }
                    }
                    else {
                        return response.status(404).send({ messae: "account with this email address not found" });
                    }
                }
            }
            return undefined;
        });
    }
    init(response, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.check()) {
                const session = new session_1.default(this.db, this.error);
                const userID = yield session.get(id);
                if (userID) {
                    const init = yield this.db.process("SELECT * FROM users WHERE id = ?", [userID], "fetching user error");
                    if (init) {
                        const rows = init;
                        if (rows && rows.length > 0) {
                            const result = rows[0];
                            if (result.type === "individual") {
                                return new individual_1.default(this.db, this.error).get(response, userID, result.email, result.phone);
                            }
                            else if (result.type === "organization") {
                                return new organization_1.default(this.db, this.error).get(response, userID, result.email, result.phone);
                            }
                            else {
                                return response.status(201).send({ id: id, email: result.email, phone: result.phone, type: result.type, verified: result.verified });
                            }
                        }
                        else {
                            return response.status(404).send({ messae: "account with this email address not found" });
                        }
                    }
                }
            }
            return undefined;
        });
    }
}
exports.User = User;
exports.userRouter = express_1.default.Router();
exports.userRouter.get("/login", (req, res) => {
    if (req.body.email && req.body.password) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        new User(database, error).login(res, req.body.email, req.body.password).then((init) => {
            if (init === undefined && error.has_error()) {
                return error.display(res);
            }
            else {
                return init;
            }
        });
    }
    else {
        return res.status(500).send({ message: "invalid request to server" });
    }
});
exports.userRouter.post("/signup", (req, res) => {
    if (req.body.email && req.body.phone && req.body.password) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        new User(database, error).write(res, req.body.email, req.body.phone, req.body.password).then((init) => {
            if (init === undefined && error.has_error()) {
                return error.display(res);
            }
            else {
                return init;
            }
        });
    }
    else {
        return res.status(500).send({ message: "invalid request to server" });
    }
});
exports.userRouter.get("/", (req, res) => {
    if (req.headers.authorization) {
        const error = new error_1.default();
        const database = new database_1.default(error);
        new User(database, error).init(res, req.headers.authorization).then((init) => {
            if (init === undefined && error.has_error()) {
                return error.display(res);
            }
            else {
                return init;
            }
        });
    }
    else {
        return res.status(500).send({ message: "invalid request to server" });
    }
});
