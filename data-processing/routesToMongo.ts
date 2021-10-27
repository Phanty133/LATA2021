import { MongoClient } from "mongodb";
import csvparser from "csv-parse";
import path from "path";
import fse from "fs-extra";

const filepath = "./data/0/routes.csv";
const shapePath = "./data/0/shapes.csv";

const url = "mongodb+srv://busify:q94T9puKo93yyg0D@busify.asyhl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);
const dbName = "static";
const collectionName = "routes";

interface tData {
	routeId: string,
	shortName: string,
	longName: string,
	type: number,
	url: string,
	shape: Record<string, number[][]>
}

(async () => {
	const parser = csvparser({ delimiter: ",", fromLine: 2 });
	fse.createReadStream(filepath).pipe(parser);

	const shapeParser = csvparser({ delimiter: ",", fromLine: 2 });
	fse.createReadStream(shapePath).pipe(shapeParser);

	await client.connect();
	console.log("Mongo connected!");

	const db = client.db(dbName);
	const collection = db.collection(collectionName);

	const data: tData[] = [];
	const shapeData: Record<string, number[][]> = {}; // ID: Shape []

	for await (const record of shapeParser) {
		const id = record[0];

		if (id in shapeData) {
			shapeData[id].push([Number(record[1]), Number(record[2])]);
		} else {
			shapeData[id] = [[Number(record[1]), Number(record[2])]];
		}
	}

	for await (const record of parser) {
		const type = record[3] === "3" ? "0" : (record[3] === "800" ? "1" : "2");
		const shapeIDs = Object.keys(shapeData);
		const relevantShapeIDs = shapeIDs.filter((id) => id.match(new RegExp(`${record[0]}_`)));
		const routeShapeData: Record<string, number[][]> = {};

		for (const id of relevantShapeIDs) {
			routeShapeData[id.substring(record[0].length + 1)] = shapeData[id];
		}

		data.push({
			routeId: record[0],
			shortName: record[1],
			longName: record[2],
			type: Number(type),
			url: record[4],
			shape: routeShapeData,
		});
	}

	await collection.insertMany(data);
	client.close();
})().catch(() => { client.close(); });
