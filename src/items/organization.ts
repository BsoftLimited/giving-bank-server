import Database from "../config/database";
import ErrorHandler from "../config/error";
import mysql from "mysql2";
import express, { Response } from "express";
import Session from "../config/session";
import { User } from "./user";

export default class Organization {
    db: Database;
    error: ErrorHandler;

    constructor(db: Database, error: ErrorHandler){
        this.db = db;
        this.error = error;
    }
    
    async check(): Promise<boolean>{
        const init = await this.db.checkTable("organizations");
        if(init === 0){
            const query = `CREATE TABLE organizations (userID CHAR(50) NOT NULL PRIMARY KEY,  name CHAR(50) NOT NULL, interest CHAR(20) NOT NULL, taxID CHAR(20) NOT NULL,
                    state CHAR(20) NOT NULL, lga CHAR(20) NOT NULL, address CHAR(100) NOT NULL)`;

            return await this.db.createTable(query);
        }
        return init == 1;
    }
    
    async check_organization(userID: string): Promise<boolean | undefined>{
        const init = await this.db.process("SELECT * FROM organizations WHERE userID = ?", [userID], "unable to get organization details");
        if(init){
            const rows = init as mysql.RowDataPacket[];
            return rows.length > 0;
        }
        return undefined;
    }

    async write(response: Response, id: string, name: string, interest: string, taxID: string, state: string, lga: string, address: string): Promise<Response<any, Record<string, any>> | undefined>{
        const userID = await new Session(this.db, this.error).get(id);
        const user = new User(this.db, this.error);
        if(userID && await this.check()){
            if(await this.check_organization(userID)){
                return response.status(500).send({ messae: "organization already exist for user"});
            }else{
                const init = await this.db.process("INSERT INTO organizations SET userID = ?, name = ?, interest = ?, taxID = ?, state = ?, lga = ?, address = ?",
                    [userID, name, interest, taxID, state, lga, address ], "organization registration failed");
                if(init && await user.make(userID, "organization")){
                    return response.status(201).send({ message: "organization registration success" });
                }
            }
        }
    }

    async get(response: Response, userID: string, email: string, phone: string): Promise<Response<any, Record<string, any>> | undefined>{
        if(await this.check()){
            const init = await this.db.process("SELECT * FROM organizations WHERE userID = ?", [userID], "unable to fetch organization details");
            if(init){
                const rows = init as mysql.RowDataPacket[];
                if(rows && rows.length > 0){
                    const result = rows[0];
                    
                    return response.status(200).send({
                        email: email, verified: true, type: "organization", phone: phone,
                        account: { 
                            name: result.name, interest: result.interest, taxID: result.taxID,
                            address: { state: result.state, lga: result.lga, address: result.address }
                    }});
                }else{
                    return response.status(404).send({ messae: "organization details not found" });
                }
            }
        }
        return undefined;
    }
}

export const organizationRouter = express.Router();

organizationRouter.post("/create", (req, res) =>{
    if(req.headers.authorization && req.body.name && req.body.interest && req.body.taxID && req.body.state && req.body.lga && req.body.address){
        const error = new ErrorHandler();
        const database = new Database(error);

        new Organization(database, error).write(res, req.headers.authorization, req.body.name, req.body.interest, req.body.taxID, req.body.state, req.body.lga, req.body.address).then((init) =>{
            if(init === undefined || error.has_error()){
                return error.display(res);
            }
            return init;
        });
    }else{
        return res.status(500).send({message: "invalid request to server"});
    }
});