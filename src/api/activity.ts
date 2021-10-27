import express from "express";
import { ConnectionCheckOutFailedEvent, Db } from "mongodb";
import { db } from "../db";

export const activityRouter = express.Router();

let activityDb: Db | null;

(async () => {
	activityDb = await db.activity;
})();

let staticDb: Db | null;

(async () => {
	staticDb = await db.static;
})();

activityRouter.get("/routes", async (req, res) => {
	if (activityDb === null || staticDb === null) {
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

	const month = Number(req.query.month);
	const day = Number(req.query.day);
	const hour = req.query.hour ? Number(req.query.hour) : null;

	if (month < 0 || month > 11) {
		res.status(400).send("Invalid month");
		return;
	}

	if (day < 1 || day > 31) {
		res.status(400).send("Invalid day");
		return;
	}

	if (hour !== null) {
		if (hour < 0 || hour > 23) {
			res.status(400).send("Invalid hour");
			return;
		}	
	}

	const data = await activityDb.collection("routeValidations").find({
		month,
		day,
	}, { projection: { passengers: 1, id: 1, _id: 0 } }).toArray();

	let sendData: any[] = [];

	if (hour === null) {
		sendData = data;
	} else {
		let maxPassengers: number = 1; // Non-zero to not divide by zero in case no passengers exist

		for (const doc of data) {
			if (!(hour in doc.passengers)) continue;

			if (maxPassengers < doc.passengers[hour]) maxPassengers = doc.passengers[hour];
		}

		for (const doc of data) {
			if (!(hour in doc.passengers)) continue;

			sendData.push({
				...doc,
				passengers: doc.passengers[hour],
				relativeActivity: Math.round(doc.passengers[hour] / maxPassengers * 1000) / 1000,
			});
		}
	}

	if (req.query.client === "true") {
		const clientData = await staticDb.collection("routes").find({}).toArray();

		for (const entry of sendData) {
			const activityEntry = clientData.find((e) => e.routeId === entry.id);
			
			if (!activityEntry) continue;

			entry.shape = activityEntry.shape;
			entry.longName = activityEntry.longName;
			entry.shortName = activityEntry.shortName;
			entry.type = activityEntry.type;
			entry.url = activityEntry.url;
		}
	}

	res.json(sendData);
});

activityRouter.get("/trips", async (req, res) => {
	if (activityDb === null || staticDb === null) {
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

	if (!req.query.route && !req.query.trip) {
		res.status(400).send("No route or trip ID provided");
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

	const findQuery: Record<string, any> = { month };

	if (req.query.route) {
		findQuery.routeId = req.query.route.toString();
	} else if (req.query.trip) {
		findQuery.id = req.query.trip.toString();
	}

	const data = await activityDb.collection("tripValidations").find(findQuery, { projection: { _id: 0 } }).toArray();
	const sendData: any[] = [];

	for (const doc of data) {
		if (!(day in doc.passengers)) continue;

		sendData.push({ ...doc, passengers: doc.passengers[day] });
	}

	res.json(req.query.trip ? sendData[0] : sendData);
});

activityRouter.get("/stops", async (req, res) => {
	res.sendStatus(501);
});
