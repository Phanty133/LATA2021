import express from "express";
import { Db } from "mongodb";
import { db } from "../db";

export const dataRouter = express.Router();

let staticDb: Db | null;

(async () => {
	staticDb = await db.static;
})();

dataRouter.get("/routes", async (req, res) => {
	if (staticDb === null) {
		res.sendStatus(500);
		return;
	}

	res.json(await staticDb.collection("routes").find({}).toArray());
});

dataRouter.get("/trips", async (req, res) => {
	if (staticDb === null) {
		res.sendStatus(500);
		return;
	}

	if (!req.query.month) {
		res.status(400).send("No month provided");
		return;
	}

	if (!req.query.day) {
		res.status(400).send("No day provided");
		return;
	}

	if (!req.query.route) {
		res.status(400).send("No route ID provided");
		return;
	}

	const month = Number(req.query.month);
	const day = Number(req.query.day);

	if (month < 0 || month > 11) {
		res.status(400).send("Invalid month");
		return;
	}

	if (day < 1 || day > 31) {
		res.status(400).send("Invalid day");
		return;
	}

	const data = await staticDb.collection("trips").find({
		routeId: req.query.route.toString()
	}).toArray();

	res.json(data);
});

dataRouter.get("/stopTimes", async (req, res) => {
	if (staticDb === null) {
		res.sendStatus(500);
		return;
	}

	if (!req.query.trip) {
		res.status(400).send("No trip ID provided");
		return;
	}

	const stopTimes = await staticDb.collection("stopTimes").find({
		tripId: req.query.trip.toString()
	}).toArray();

	res.json(stopTimes);
});

dataRouter.get("/stops", async (req, res) => {
	if (staticDb === null) {
		res.sendStatus(500);
		return;
	}

	let stopIds: string[] = [];

	if (req.query.trip) {
		const stopTimes = await staticDb.collection("stopTimes").find({
			tripId: req.query.trip.toString()
		}).toArray();

		stopIds = stopTimes.map((entry) => entry.stopId);
	} else if (req.query.stops) {
		stopIds = req.query.stops.toString().split(",");
	} else {
		res.status(400).send("No trip ID or stop IDs provided");
		return;
	}

	const data = await staticDb.collection("stops").find({
		stopId: { $in: stopIds }
	}).toArray();

	res.json(data);
});
