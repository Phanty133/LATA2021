import csvparse from "csv-parse";
import csvstringify from "csv-stringify";
import fse from "fs-extra";
import path from "path";

const tripInput = path.join(__dirname, "data", "trips-01.csv");
const stopTimeInput = path.join(__dirname, "data", "stop_times-01.csv");
const outputPath = path.join(__dirname, "processed-data", "trip_intervals.csv");

function timeToMinTimestamp(time12Hr: string) {
	const splitTimeRaw = time12Hr.split(" ");
	const splitTime = splitTimeRaw[0].split(":");
	const offset = splitTimeRaw[1] === "PM" ? 720 : 0;
	
	return offset + Number(splitTime[0]) * 60 + Number(splitTime[1]);
}

interface ParsedTrip {
	route_id: string,
	direction: number,
	block_id: number,
	min: number,
	max: number,
}

interface Stop{
	arrival_time: string,
	departure_time: string,
	stop_sequence: number,
}

(async () => {
	process.stdout.write("Reading input... ");
	const tripParser = csvparse({ delimiter: ",", from_line: 2 });
	const stopTimeParser = csvparse({ delimiter: ",", from_line: 2 });

	const tripStream = fse.createReadStream(tripInput);
	const stopTimeStream = fse.createReadStream(stopTimeInput);

	tripStream.pipe(tripParser);
	stopTimeStream.pipe(stopTimeParser);

	// Read stop times into memory

	const stops: Record<string, Stop[]> = {};

	for await (const stopRecord of stopTimeParser) {
		const stopData: Stop = {
			arrival_time: stopRecord[1],
			departure_time: stopRecord[2],
			stop_sequence: Number(stopRecord[4]),
		};

		if (stopRecord[0] in stops) {
			stops[stopRecord[0]].push(stopData);
		} else {
			stops[stopRecord[0]] = [ stopData ];
		}
	}

	process.stdout.write("Done\n");

	process.stdout.write("Processing data... ");

	const outputData: ParsedTrip[] = [];
	let row = 0;

	for await (const tripRecord of tripParser) {
		const tripID = tripRecord[2];

		let min = 0;
		let max = 0;

		let skip = false;

		for (const stopTimeRecord of stops[tripID]) {
			if (stopTimeRecord.stop_sequence === 1) {
				if (stopTimeRecord.arrival_time === "") {
					skip = true;
					break;
				}

				min = timeToMinTimestamp(stopTimeRecord.arrival_time);
			} else {
				const departureTimestamp = timeToMinTimestamp(stopTimeRecord.departure_time);

				if (stopTimeRecord.stop_sequence === stops[tripID].length && stopTimeRecord.departure_time === "") {
					skip = true;
					break;
				}

				if (departureTimestamp > max) max = departureTimestamp;
			}
		}

		if (!skip) {
			outputData.push({
				route_id: tripRecord[0],
				direction: tripRecord[4],
				block_id: tripRecord[5],
				min,
				max,
			});
		}

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`Processing data... Row: ${++row}`);
	}

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`Processing data... Done\n`);

	process.stdout.write("Writing output... ");

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		await fse.writeFile(outputPath, output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();
