import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "activity";
const collectionName = "tripValidations";

interface tData {
	id: string,
	passengers: number[],
	month: number,
	routeId: string,
}

(async () => {
	const data: Record<string, tData> = {};

	const dictParser = csvparser({ delimiter: "," });
	fse.createReadStream(path.join(__dirname, "processed-data", "trip_intervals-01.csv")).pipe(dictParser);

	const tripDict: Record<string, string> = {}; // TripID: RouteID

	for await (const record of dictParser) {
		tripDict[record[6]] = record[0];
	}

	for (let i = 1; i <= 31; i++) {
		const parser = csvparser({ delimiter: ",", fromLine: 2 });
		const day = i.toString().length === 1 ? `0${i}` : i;
		fse.createReadStream(path.join(__dirname, "output", "0", `trip_validations-${day}.01.csv`)).pipe(parser);

		for await (const record of parser) {
			const id = record[0]; // TripID
			
			if (id in data) {
				data[id].passengers.push(Number(record[1]));
			} else {
				data[id] = {
					id,
					passengers: [Number(record[1])],
					month: 1,
					routeId: tripDict[id],
				}
			}
		}
	}

	await client.connect();
	console.log("Mongo connected!");

	const db = client.db(dbName);
	const collection = db.collection(collectionName);

	await collection.insertMany(Object.values(data));
	client.close();
})().catch(() => { client.close(); });
