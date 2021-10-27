import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const filepath = "./data/0/stops.csv";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "static";
const collectionName = "stops";

interface tData {
	stopId: string,
	name: string,
	coord: number[],
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
			stopId: record[0],
			name: record[2],
			coord: [Number(record[4]), Number(record[5])]
		});
	}

	await collection.insertMany(data);
	client.close();
})().catch(() => { client.close(); });
