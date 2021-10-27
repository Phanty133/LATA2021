import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { apiRouter } from "./api/api";
import { connectToMongo } from "./db";

const app = express();

app.use(cors());

app.use("/api", apiRouter);

app.get("/", (req, res) => {
	res.send("Hello world!");
});

app.listen(process.env.PORT, () => {
	console.log(`Listening on port ${process.env.PORT}`);

	connectToMongo();
});
