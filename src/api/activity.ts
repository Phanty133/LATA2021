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

			if (req.query.simpleShape === "true") {
				entry.shape = activityEntry.shape["a-b"];
			} else {
				entry.shape = activityEntry.shape;
			}
			
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

	let maxPassengers = 1;

	for (const doc of data) {
		if (!(day in doc.passengers)) continue;

		if (maxPassengers < doc.passengers[day]) maxPassengers = doc.passengers[day];
	}

	for (const doc of data) {
		if (!(day in doc.passengers)) continue;

		sendData.push({
			...doc,
			passengers: doc.passengers[day],
			relativeActivity: Math.round(doc.passengers[day] / maxPassengers * 1000) / 1000,
		});
	}

	res.json(req.query.trip ? sendData[0] : sendData);
});

activityRouter.get("/stops", async (req, res) => {
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

	if (!req.query.hour) {
		res.status(400).send("No hour provided");
	}

	if (!req.query.route) {
		res.status(400).send("No route ID provided");
		return;
	}

	const month = Number(req.query.month);
	const day = Number(req.query.day);
	const hour = Number(req.query.hour);

	if (month < 0 || month > 11) {
		res.status(400).send("Invalid month");
		return;
	}

	if (day < 1 || day > 31) {
		res.status(400).send("Invalid day");
		return;
	}

	if (hour < 0 || hour > 23) {
		res.status(400).send("Invalid hour");
	}

	const tripData = await staticDb.collection("trips").find({
		routeId: req.query.route.toString(),
		start: {$gt: hour * 60 - 30, $lt: hour * 60 + 90},
		direction: 0,
	}).toArray();

	console.log(tripData);

	const tripIds = tripData.map((e) => e.tripId);

	const dbStopData = await activityDb.collection("stopValidations").find({
		tripId: { $in: tripIds },
	}).toArray();

	let stops: Record<string, any> = [];

	for (const stop of dbStopData) {
		if (stop.stopId in stops) {
			stops[stop.stopId].passengers += stop.passengers[day - 1];
		} else {
			stops[stop.stopId] = {
				stopId: stop.stopId,
				month: stop.month,
				coord: stop.coord,
				passengers: stop.passengers[day - 1],
			}
		}
	}

	const stopData = Object.values(stops);
	const stopIds = stopData.map((e) => e.stopId);

	const stopLocations = await staticDb.collection("stops").find({
		stopId: {$in: stopIds}
	}).toArray();

	let maxPassengers = 1;

	for (const stopDoc of stopData) {
		if (stopDoc.passengers > maxPassengers) maxPassengers = stopDoc.passengers;
	}

	for (const stopDoc of stopData) {
		const activityRatio = stopDoc.passengers / maxPassengers;
		stopDoc.relativeActivity = Math.round(activityRatio * 1000) / 1000;
		stopDoc.coord = stopLocations.find((doc) => doc.stopId === stopDoc.stopId)?.coord;
	}

	res.json(stopData);
});
