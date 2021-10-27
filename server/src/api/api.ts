import express from "express";
import { activityRouter } from "./activity";
import { dataRouter } from "./data";

export const apiRouter = express.Router();

apiRouter.use("/data", dataRouter);
apiRouter.use("/activity", activityRouter);
