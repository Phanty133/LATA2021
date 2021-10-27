import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "activity";
const collectionName = "routeValidations";

interface tData {
	id: string,
	passengers: Record<number, number>,
	month: number,
	day: number,
}

(async () => {
	const dataArr: Record<string, tData>[] = [];

	for (let i = 1; i <= 31; i++) {
		const parser = csvparser({ delimiter: "," });
		const day = i.toString().length === 1 ? `0${i}` : i;
		const data: Record<string, tData> = {};
		fse.createReadStream(path.join(__dirname, "output", "0", `route_validations-${day}.01.csv`)).pipe(parser);

		for await (const record of parser) {
			const id = record[0]; // RouteID
			const timestamp = Number(record[1]);
			const passengers = Number(record[2]);

			if (id in data) {
				data[id].passengers[timestamp] = passengers;
			} else {
				const passengerObj: Record<number, number> = {};

				passengerObj[timestamp] = passengers;

				data[id] = {
					id,
					passengers: passengerObj,
					month: 1,
					day: i,
				}
			}
		}

		dataArr.push(data);
	}

	await client.connect();
	console.log("Mongo connected!");

	const db = client.db(dbName);
	const collection = db.collection(collectionName);

	await collection.insertMany(dataArr.flatMap((e) => Object.values(e)));
	client.close();
})().catch(() => { client.close(); });
