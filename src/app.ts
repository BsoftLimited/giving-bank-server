import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express, {Request, Response} from "express";
import { individualRouter } from "./items/individual";
import { kycRouter } from "./items/kyc";
import { organizationRouter } from "./items/organization";
import { userRouter } from "./items/user";

dotenv.config();

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use("/user", userRouter);
app.use("/kyc", kycRouter);
app.use("/individual", individualRouter);
app.use("/organization", organizationRouter);

app.get("/", async (req: Request, res: Response) => {
    return res.status(200).send({message: "welcome to giveaway api"});
});

app.listen(process.env.PORT, () => {
    console.log(`Node server started running at post: ${process.env.PORT}`);
});