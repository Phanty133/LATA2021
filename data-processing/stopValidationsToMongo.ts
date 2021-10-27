import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "activity";
const collectionName = "stopValidations";

interface tData {
	tripId: string,
	stopId: string,
	passengers: number[],
	month: number,
}

(async () => {
	const data: Record<string, tData> = {};

	for (let i = 1; i <= 31; i++) {
		const parser = csvparser({ delimiter: ",", fromLine: 2 });
		const day = i.toString().length === 1 ? `0${i}` : i;
		fse.createReadStream(path.join(__dirname, "output", "0", `stop_validations-${day}.01.csv`)).pipe(parser);

		for await (const record of parser) {
			const id = `${record[0]}-${record[5]}`; // TripID-StopID
			
			if (id in data) {
				data[id].passengers.push(Number(record[3]));
			} else {
				data[id] = {
					tripId: record[0],
					stopId: record[5],
					passengers: [Number(record[3])],
					month: 1,
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
