import express, { Response } from "express";
import mysql from "mysql2";
import Database from "../config/database";
import ErrorHandler from "../config/error";
import Session from "../config/session";
import uuid from "../utils";
import Individual from "./individual";
import Organization from "./organization";

export class User {
    db: Database;
    error: ErrorHandler;

    constructor(db: Database, error: ErrorHandler){
        this.db = db;
        this.error = error;
    }
    
    async check(): Promise<boolean>{
        const init = await this.db.checkTable("users");
        if(init === 0){
            return this.db.createTable(`CREATE TABLE users (id CHAR(50) NOT NULL PRIMARY KEY, email CHAR(50) NOT NULL, phone CHAR(50) NOT NULL, password CHAR(20) NOT NULL, type CHAR(50) NOT NULL DEFAULT 'unknown', verified CHAR(20) NOT NULL DEFAULT 'false')`);
        }
        return init == 1;
    }
    
    async check_users(email: string): Promise<boolean | undefined>{
        const init = await this.db.process("SELECT * FROM users WHERE email = ?", [email], "user checking error");
        if(init){
            const rows = init as mysql.RowDataPacket[];
            return rows.length > 0;
        }
        return undefined;
    }

    async write(response: Response, email: string, phone: string, password: string): Promise<Response<any, Record<string, any>> | undefined>{
        let userID = uuid();
        try{
            if(await this.check()){
                if(await this.check_users(email)){
                    return response.status(500).send({ message: "user with the same email already exists"});
                }else{
                    const init = await this.db.process("INSERT INTO users SET id = ?, email = ?, phone = ?, password = ?", [userID, email, phone, password], "user registration failed");
                    if(init){
                        const session = new Session(this.db, this.error);
                        const id = await session.create(userID);
                        if(id){
                            return response.status(201).send({ id: id, email: email, phone: phone, type: "unknown", verified: false });
                        }else{
                            return response.status(500).send({ message: "session creation failed, but registrated succesfully, try login in" });
                        }
                    }
                }
            }
        }catch(error){
            console.log(error);
        }
        return response.status(500).send({ message: "unknown server errror" });
    }

    async make(userID: string, type: string,): Promise<boolean>{
        try{
            if(await this.check()){
                const init = await this.db.process("UPDATE users SET type = ? WHERE id = ?", [type, userID], "unable to update user details");
                if(init){
                    return true;
                }
            }
        }catch(error){
            console.log(error);
        }
        return false;
    }

    async login(response: Response, email: string, password: string): Promise<Response<any, Record<string, any>> | undefined>{
        if(await this.check()){
            const init = await this.db.process("SELECT * FROM users WHERE email = ?", [email], "email or user does not exits");
            if(init){
                const rows = init as mysql.RowDataPacket[];
                if(rows && rows.length > 0){
                    const result = rows[0];
                    if(result.password === password){
                        const session = new Session(this.db, this.error);
                        const id = await session.create(result.id);
                        if(id){
                            return response.status(200).send({ id: id, email: email, phone: result.phone, type: result.type, verified: result.verified });
                        }
                    }else{
                        return response.status(400).send({ messae: "incorrect password, please try again" });
                    }
                }else{
                    return response.status(404).send({ messae: "account with this email address not found" });
                }
            }
        }
        return undefined;
    }

    async init(response: Response, id: string): Promise<Response<any, Record<string, any>> | undefined>{
        if(await this.check()){
            const session = new Session(this.db, this.error);
            const userID = await session.get(id);
            if(userID){
                const init = await this.db.process("SELECT * FROM users WHERE id = ?", [userID], "fetching user error");
                if(init){
                    const rows = init as mysql.RowDataPacket[];
                    if(rows && rows.length > 0){
                        const result = rows[0];
                        if(result.type === "individual"){
                            return new Individual(this.db, this.error).get(response, userID, result.email, result.phone);
                        }else if(result.type === "organization"){
                           return new Organization(this.db, this.error).get(response, userID, result.email, result.phone);
                        }else{
                            return response.status(201).send({ id: id, email: result.email, phone: result.phone, type:result.type, verified: result.verified });
                        }
                    }else{
                        return response.status(404).send({ messae: "account with this email address not found" });
                    }
                }
            }
        }
        return undefined;
    }
}

export const userRouter = express.Router();

userRouter.get("/login", (req, res) =>{
    if(req.body.email && req.body.password){
        const error = new ErrorHandler();
        const database = new Database(error);

        new User(database, error).login(res, req.body.email, req.body.password).then((init) =>{
            if(init === undefined && error.has_error()){
                return error.display(res);
            }else{
                return init;
            }
        });
    }else{
        return res.status(500).send({message: "invalid request to server"});
    }
});

userRouter.post("/signup", (req, res) =>{
    if(req.body.email && req.body.phone && req.body.password){
        const error = new ErrorHandler();
        const database = new Database(error);

        new User(database, error).write(res, req.body.email, req.body.phone, req.body.password).then((init) =>{
            if(init === undefined && error.has_error()){
                return error.display(res);
            }else{
                return init;
            }
        });
    }else{
        return res.status(500).send({message: "invalid request to server"});
    }
});

userRouter.get("/", (req, res) =>{
    if(req.headers.authorization){
        const error = new ErrorHandler();
        const database = new Database(error);

        new User(database, error).init(res, req.headers.authorization).then((init) =>{
            if(init === undefined && error.has_error()){
                return error.display(res);
            }else{
                return init;
            }
        });
    }else{
        return res.status(500).send({message: "invalid request to server"});
    }
});