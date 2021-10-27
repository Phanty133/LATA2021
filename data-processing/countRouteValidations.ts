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

		const timeRaw: string = record[8];
		const timeSplit = timeRaw.split(" "); // 0 - date, 1 - time
		const dateReversed = timeSplit[0].split(".").reverse().join("-");
		const dateString = `${dateReversed}T${timeSplit[1]}`;
		const unixTimestamp = Math.floor(Date.parse(dateString) / 1000);
		const hourTimestamp = Math.floor(unixTimestamp / 3600) % 24;

		if (route in data) {
			if (hourTimestamp in data[route]) {
				data[route][hourTimestamp]++;
			} else {
				data[route][hourTimestamp] = 1;
			}
		} else {
			data[route] = {};
			data[route][hourTimestamp] = 1;
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