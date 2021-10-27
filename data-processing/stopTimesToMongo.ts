import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const filepath = "./data/0/stop_times-01.csv";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "static";
const collectionName = "stopTimes";

function timeToMinTimestamp(time12Hr: string) {
	const splitTimeRaw = time12Hr.split(" ");
	const splitTime = splitTimeRaw[0].split(":");
	const offset = splitTimeRaw[1] === "PM" ? 720 : 0;
	
	return offset + Number(splitTime[0]) * 60 + Number(splitTime[1]);
}

interface tData {
	tripId: string,
	arrival: number,
	stopId: string,
	sequence: number,
}

(async () => {
	const parser = csvparser({ delimiter: ",", fromLine: 2 });
	fse.createReadStream(filepath).pipe(parser);

	await client.connect();
	console.log("Mongo connected!");

	const db = client.db(dbName);
	const collection = db.collection(collectionName);

	const data: tData[] = [];

	for await (const record of parser) {
		data.push({
			tripId: record[0],
			arrival: timeToMinTimestamp(record[1]),
			stopId: record[3],
			sequence: Number(record[4]),
		});
	}

	await collection.insertMany(data);
	client.close();
})().catch(() => { client.close(); });
