import { MongoClient, Db } from "mongodb";

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/static?retryWrites=true&w=majority`;
const client = new MongoClient(url);

interface DB {
	static: Promise<Db>,
	activity: Promise<Db>,
};

const dbPromiseFuncs: Record<string, (value: any) => void> = {};

export const db: DB = {
	static: new Promise<Db>((res, rej) => {
		dbPromiseFuncs.staticRes = res;
		dbPromiseFuncs.staticRej = rej;
	}),
	activity: new Promise<Db>((res, rej) => {
		dbPromiseFuncs.activityRes = res;
		dbPromiseFuncs.activityRej = rej;
	}),
};

export async function connectToMongo() {
	try {
		await client.connect();
	} catch (err) {
		dbPromiseFuncs.staticRej(err);
		dbPromiseFuncs.staticRej(err);
		return;
	}
	
	console.log("Connected to MongoDB");
	
	dbPromiseFuncs.staticRes(client.db("static"));
	dbPromiseFuncs.activityRes(client.db("activity"));
}
