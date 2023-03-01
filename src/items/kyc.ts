import Database from "../config/database";
import ErrorHandler from "../config/error";
import mysql from "mysql2";
import express, { Response } from "express";
import Session from "../config/session";

export default class KYC {
    db: Database;
    error: ErrorHandler;

    constructor(db: Database, error: ErrorHandler){
        this.db = db;
        this.error = error;
    }
    
    async check(): Promise<boolean>{
        const init = await this.db.checkTable("kyc");
        if(init === 0){
            const query = `CREATE TABLE kyc (userID CHAR(50) NOT NULL PRIMARY KEY,  bank_name CHAR(20) NOT NULL, bank_account CHAR(20) NOT NULL, bvn CHAR(20) NOT NULL,
                    bank_account_name CHAR(20) NOT NULL)`;

            return await this.db.createTable(query);
        }
        return init == 1;
    }
    
    async check_kyc(userID: string): Promise<boolean | undefined>{
        const init = await this.db.process("SELECT * FROM kyc WHERE userID = ?", [userID], "unable to get organization details");
        if(init){
            const rows = init as mysql.RowDataPacket[];
            return rows.length > 0;
        }
        return undefined;
    }

    async write(response: Response, id: string, bank_name: string, bank_account: string, bank_account_name: string, bvn: string): Promise<Response<any, Record<string, any>> | undefined>{
        const userID = await new Session(this.db, this.error).get(id);
        if(userID && await this.check()){
            if(await this.check_kyc(userID)){
                return response.status(500).send({ messae: "kyc details already exist for user"});
            }else{
                const init = await this.db.process("INSERT INTO kyc SET userID = ?, bank_name = ?, bank_account = ?, bvn = ?, bank_account_name = ?",
                    [userID, bank_name, bank_account, bvn, bank_account_name ], "kyc registration failed");
                if(init){
                    return response.status(201).send({ message: "kyc registration success" });
                }
            }
        }
    }

    async get(response: Response, userID: string): Promise<Response<any, Record<string, any>> | undefined>{
        if(await this.check()){
            const init = await this.db.process("SELECT * FROM kyc WHERE userID = ?", [userID], "unable to fetch kyc details");
            if(init){
                const rows = init as mysql.RowDataPacket[];
                if(rows && rows.length > 0){
                    const result = rows[0];
                    
                    return response.status(200).send({ bank_name: result.bank_name, bank_account: result.bank_account, bank_account_name: result.bank_account_name, bvn: result.bvn});
                }else{
                    return response.status(404).send({ messae: "kyc details not found" });
                }
            }
        }
        return undefined;
    }
}

export const kycRouter = express.Router();

kycRouter.post("/create", (req, res) =>{
    if(req.headers.authorization && req.body.bank_name && req.body.bank_account && req.body.bank_account_name && req.body.bvn){
        const error = new ErrorHandler();
        const database = new Database(error);

        new KYC(database, error).write(res, req.headers.authorization, req.body.bank_name, req.body.bank_account, req.body.bank_account_name, req.body.bvn).then((init) =>{
            if(init === undefined || error.has_error()){
                return error.display(res);
            }
            return init;
        });
    }else{
        return res.status(500).send({message: "invalid request to server"});
    }
});