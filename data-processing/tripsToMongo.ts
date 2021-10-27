import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const filepath = "./processed-data/trip_intervals-01.csv";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "static";
const collectionName = "trips";

interface tData {
	routeId: string,
	start: number,
	end: number,
	tripId: string,
	direction: number,
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
			routeId: record[0],
			tripId: record[6],
			start: Number(record[3]),
			end: Number(record[4]),
			direction: Number(record[1]),
		});
	}

	await collection.insertMany(data);
	client.close();
})().catch(() => { client.close(); });
