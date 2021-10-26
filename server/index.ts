import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { apiRouter } from "./api/api";
import { connectToMongo } from "./db";

const app = express();

app.use("/api", apiRouter);

app.get("/", (req, res) => {
	res.send("Hello world!");
});

app.listen(process.env.PORT, () => {
	console.log(`Listening on port ${process.env.PORT}`);

	connectToMongo();
});
