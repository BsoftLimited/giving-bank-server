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
const mysql2_1 = __importDefault(require("mysql2"));
class Database {
    constructor(error) {
        this.db = mysql2_1.default.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PWD,
            database: process.env.DB_NAME
        });
        this.db.connect((error) => { console.log(error); });
        this.error = error;
    }
    checkTable(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = "SELECT * FROM information_schema.tables WHERE table_schema = ? AND table_name = ?";
            let init = yield new Promise((resolve, reject) => {
                this.db.query(query, [process.env.DB_NAME, name], (error, result) => {
                    if (error) {
                        this.error.add(500, JSON.stringify(error), "server error");
                        resolve(2);
                    }
                    else {
                        const rows = result;
                        if (rows.length > 0) {
                            resolve(1);
                        }
                        else {
                            resolve(0);
                        }
                    }
                });
            });
            return init;
        });
    }
    createTable(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => {
                this.db.query(query, (error, result) => {
                    if (error) {
                        this.error.add(500, JSON.stringify(error), "server error");
                        resolve(false);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        });
    }
    process(query, params, errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => {
                this.db.query(query, params, (error, result) => {
                    if (error) {
                        this.error.add(500, JSON.stringify(error), errorMessage);
                        console.log(error);
                        resolve(undefined);
                    }
                    ;
                    resolve(result);
                });
            });
        });
    }
}
exports.default = Database;
