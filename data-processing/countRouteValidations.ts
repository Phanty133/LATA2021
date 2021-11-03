import csvparse from "csv-parse";
import path from "path";
import fse from "fs-extra";
import csvstringify from "csv-stringify";

const date = new Date(2021, process.argv[2] ? Number(process.argv[2]) : 0, process.argv[3] ? Number(process.argv[3]) : 1);
const dateDayStr: string = date.getDate().toString().length === 1 ? `0${date.getDate()}` : date.getDate().toString();
const monthStr: string = (date.getMonth() + 1).toString().length === 1 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1).toString();

const fileName = `ValidDati${dateDayStr}_${monthStr}_${date.getFullYear().toString().substring(2)}.txt`;
const inputDir = path.join(__dirname, "data", process.argv[2]);
const outputDir = path.join(__dirname, "output", process.argv[2]);
const outName = `route_validations-${dateDayStr}.${monthStr}.csv`;

const tTypeDict: Record<string, string> = {
	"A": "bus",
	"Tm": "tram",
	"Tr": "trol"
};

interface Timestamp {
	year: number,
	month: number,
	date: number,
	hour: number,
	minute: number,
	unix: number,
}

function parseTimestampEntry(entry: string): Timestamp{
	const splitStr = entry.split(" ");
	const dateSplit = splitStr[0].split(".");
	const timeSplit = splitStr[1].split(":");
	const unix = Math.floor(Date.parse(`${dateSplit.reverse().join("-")}T${timeSplit[1]}:${timeSplit[0]}:00`) / 1000);

	return {
		year: Number(dateSplit[2]),
		month: Number(dateSplit[1]),
		date: Number(dateSplit[0]),
		hour: Number(timeSplit[0]),
		minute: Number(timeSplit[1]),
		unix, 
	}
}

(async () => {
	process.stdout.write("Reading file... ");
	const parser = csvparse({ delimiter: ",", fromLine: 2 });
	const fileStream = fse.createReadStream(path.join(inputDir, fileName));
	fileStream.pipe(parser);
	process.stdout.write("Done\n");

	process.stdout.write("Processing data... ");
	const data: Record<string, Record<number, number>> = {}; // route : { timestamp : passengers }

	let row = 0;

	for await (const record of parser) {
		const routeRaw = record[5] as string;
		const routeSplit = routeRaw.split(" ");
		const tTypeRaw = routeSplit[0];
		const routeNr = routeSplit[1];
		const route = `riga_${tTypeDict[tTypeRaw]}_${routeNr}`;

		const timestamp = parseTimestampEntry(record[8]);

		if (route in data) {
			if (timestamp.hour in data[route]) {
				data[route][timestamp.hour]++;
			} else {
				data[route][timestamp.hour] = 1;
			}
		} else {
			data[route] = {};
			data[route][timestamp.hour] = 1;
		}

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`Processing data... ${row}`);

		row++;
	}

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`Processing data... Done\n`);

	process.stdout.write("Writing output... ");
	const outputData: any[][] = [];

	for (const route of Object.keys(data)) {
		for (const timestamp of Object.keys(data[route])) {
			outputData.push([route, timestamp, data[route][timestamp as any]]);
		} 
	}

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		await fse.writeFile(path.join(outputDir, outName), output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();