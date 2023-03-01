import Database from "../config/database";
import ErrorHandler from "../config/error";
import mysql from "mysql2";
import { Address } from "./address";
import express, { Response } from "express";
import Session from "../config/session";
import { User } from "./user";

export default class Individual {
    db: Database;
    error: ErrorHandler;

    constructor(db: Database, error: ErrorHandler){
        this.db = db;
        this.error = error;
    }
    
    async check(): Promise<boolean>{
        const init = await this.db.checkTable("individuals");
        if(init === 0){
            const query = `CREATE TABLE individuals (userID CHAR(50) NOT NULL PRIMARY KEY,  fname CHAR(20) NOT NULL, lname  CHAR(20) NOT NULL, nin CHAR(20) NOT NULL,
                    state CHAR(20) NOT NULL, lga CHAR(20) NOT NULL, address CHAR(100) NOT NULL)`;

            return this.db.createTable(query);
        }
        return init == 1;
    }
    
    async check_individual(userID: string): Promise<boolean | undefined>{
        const init = await this.db.process("SELECT * FROM individuals WHERE userID = ?", [userID], "unable to get individual details");
        if(init){
            const rows = init as mysql.RowDataPacket[];
            return rows.length > 0;
        }
        return undefined;
    }

    async write(response: Response, id: string, fname: string, lname: string, nin: string, state: string, lga: string, address: string): Promise<Response<any, Record<string, any>> | undefined>{
        const userID = await new Session(this.db, this.error).get(id);
        const user = new User(this.db, this.error);
        if(userID && await this.check()){
            if(await this.check_individual(userID)){
                return response.status(500).send({ messae: "destails already exist for user"});
            }else{
                const init = await this.db.process("INSERT INTO individuals SET userID = ?, fname = ?, lname = ?, nin = ?, state = ?, lga = ?, address = ?",
                    [userID, fname, lname, nin, state, lga, address ], "user details registration failed");
                if(init && await user.make(userID, "individual")){
                    return response.status(201).send({ message: "user details registration success" });
                }
            }
        }
        return undefined;
    }

    async get(response: Response, userID: string, email: string, phone: string): Promise<Response<any, Record<string, any>> | undefined>{
        if(await this.check()){
            const init = await this.db.process("SELECT * FROM individuals WHERE userID = ?", [userID], "unable to fetch user details");
            if(init){
                const rows = init as mysql.RowDataPacket[];
                if(rows && rows.length > 0){
                    const result = rows[0];
                    
                    return response.status(200).send({
                        email: email, verified: true, type: "individual", phone: phone,
                        account: { 
                            fname: result.fname, lname: result.lname, nin: result.nin,
                            address: { state: result.state, lga: result.lga, address: result.address }
                    }});
                }else{
                    return response.status(404).send({ messae: "user details not found" });
                }
            }
        }
        return undefined;
    }
}

export const individualRouter = express.Router();

individualRouter.post("/create", (req, res) =>{
    if(req.headers.authorization && req.body.fname && req.body.lname && req.body.nin && req.body.state && req.body.lga && req.body.address){
        const error = new ErrorHandler();
        const database = new Database(error);

        const individual = new Individual(database, error);
        individual.write(res, req.headers.authorization, req.body.fname, req.body.lname, req.body.nin, req.body.state, req.body.lga, req.body.address).then((init) =>{
            if(init === undefined && error.has_error()){
                return error.display(res);
            }else{
                return init;
            }
        });
    }else{
        res.status(500).send({message: "invalid request to server"});
    }
});