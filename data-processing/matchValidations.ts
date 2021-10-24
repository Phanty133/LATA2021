import csvparse from "csv-parse";
import fse from "fs-extra";
import path from "path"
import csvstringify from "csv-stringify";
import readline from "readline";

const date = new Date(2021, process.argv[2] ? Number(process.argv[2]) : 0, process.argv[3] ? Number(process.argv[3]) : 1);
const dateDayStr: string = date.getDate().toString().length === 1 ? `0${date.getDate()}` : date.getDate().toString();
const monthStr: string = (date.getMonth() + 1).toString().length === 1 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1).toString();
const dateStr = `${dateDayStr}.${monthStr}`;

const tripInputPath = path.join(__dirname, "temp", `trips_filtered-${dateStr}.csv`);
const dictInputPath = path.join(__dirname, "temp", `block_vehicle_dict-${dateStr}.dict`);
const ticketInputPath = path.join(__dirname, "temp", `etaloni-${dateStr}.csv`);
const stopTimeInputPath = path.join(__dirname, "data", process.argv[2], "stop_times-01.csv");
const outputTripPath = path.join(__dirname, "output", process.argv[2], `trip_validations-${dateStr}.csv`);
const outputStopPath = path.join(__dirname, "output", process.argv[2], `stop_validations-${dateStr}.csv`);

function timeToMinTimestamp(time12Hr: string) {
	const splitTimeRaw = time12Hr.split(" ");
	const splitTime = splitTimeRaw[0].split(":");
	const offset = splitTimeRaw[1] === "PM" ? 720 : 0;
	
	return offset + Number(splitTime[0]) * 60 + Number(splitTime[1]);
}

type BlockId = string;
type VehicleId = string;
type TripId = string;
type StopId = string;

interface Block {
	id: BlockId,
	trips: Trip[],
	vehicles: Vehicle[],
}

interface Ticket {
	timestamp: number,
	count: number,
}

interface Vehicle {
	tickets: Ticket[],
	id: VehicleId,
	block: Block,
}

interface Trip {
	id: TripId,
	block: BlockId,
	vehicles: VehicleId[],
	passengers: number, // Number of passengers during the whole trip
	stops: Stop[],
}

interface Stop {
	stopId: StopId,
	arrival: number,
	departure: number,
	tripId: TripId,
	passengers: number,
	sequence: number,
}

function readCSVStream(path: string, options = { delimiter: "," }): csvparse.Parser {
	const parser = csvparse(options);
	const stream = fse.createReadStream(path);
	stream.pipe(parser);

	return parser;
}

(async () => {
	process.stdout.write("Reading input... ");
	const tripParser = readCSVStream(tripInputPath);
	const stopParser = readCSVStream(stopTimeInputPath);
	const ticketParser = readCSVStream(ticketInputPath);

	const outputData: Record<TripId, Trip> = {};
	const ticketData: Record<VehicleId, Ticket[]> = {};
	const blockDict: Record<BlockId, VehicleId[]> = {};
	const blockData: Record<TripId, BlockId> = {};
	const stopData: Record<TripId, Stop[]> = {};

	for await (const stopEntry of stopParser) {
		const tripId: TripId = stopEntry[0].toString();
		const stop: Stop = {
			tripId,
			arrival: timeToMinTimestamp(stopEntry[1]) % 1440,
			departure: timeToMinTimestamp(stopEntry[2]) % 1440,
			passengers: 0,
			sequence: Number(stopEntry[4]),
			stopId: stopEntry[3],
		};

		if (tripId in stopData) {
			stopData[tripId].push(stop);
		} else {
			stopData[tripId] = [stop];
		}
	}

	// Sort stops by sequence in trip
	for (const stopArr of Object.values(stopData)) {
		stopArr.sort((a, b) => a.sequence - b.sequence);
	}

	for await (const ticketEntry of ticketParser) {
		const vehicleId: VehicleId = ticketEntry[0];
		const ticket: Ticket = {
			timestamp: Number(ticketEntry[3]) % 1440, // Timestamp in minutes of the day
			count: Number(ticketEntry[4]),
		};

		if (vehicleId in ticketData) {
			ticketData[vehicleId].push(ticket);
		} else {
			ticketData[vehicleId] = [ ticket ];
		}
	}

	// Sort tickets by timestamp
	for (const vehicleId of Object.keys(ticketData)) {
		ticketData[vehicleId].sort((a, b) => a.timestamp - b.timestamp);
	}

	const dictStream = fse.createReadStream(dictInputPath);
	const dictRl = readline.createInterface({
		input: dictStream,
		crlfDelay: Infinity,
	});

	for await (const dictLine of dictRl) {
		const dictEntry = dictLine.split(",");
		const blockId: BlockId = dictEntry[0];
		const vehicleCount = Number(dictEntry[1]);
		const vehicles: VehicleId[] = [];

		for (let i = 0; i < vehicleCount; i++) {
			vehicles.push(dictEntry[i + 2]);
		}

		blockDict[blockId] = vehicles;
	}

	for await (const trip of tripParser) {
		const blockId: BlockId = trip[2];
		const tripId: TripId = trip[6];

		blockData[tripId] = blockId;
	}

	process.stdout.write("Done\n");

	process.stdout.write("Processing data... 0/0");

	Object.keys(stopData).forEach((trip, tripIndex) => {
		if (!(trip in blockData)) return;

		for (let i = 0; i < stopData[trip].length - 1; i++) {
			const stop = stopData[trip][i];
			const minTime = stop.arrival;
			const maxTime = stopData[trip][i + 1].arrival;

			const blockId = blockData[trip];

			if (stop.tripId in outputData) {
				outputData[trip].stops.push(stop);
			} else {
				outputData[trip] = {
					id: trip,
					block: blockId,
					vehicles: [],
					passengers: 0,
					stops: [ stop ]
				}
			}

			for (const vehicleId of blockDict[blockId]) {
				if (!outputData[trip].vehicles.includes(vehicleId)) {
					outputData[trip].vehicles.push(vehicleId);
				}

				const tickets = ticketData[vehicleId];
				const startIndex = tickets.findIndex((t) => t.timestamp > minTime);
				const endIndex = tickets.findIndex((t) => t.timestamp > maxTime && t.timestamp > minTime);

				for (let ticketIndex = startIndex; ticketIndex < endIndex; ticketIndex++) {
					const cnt = Number(tickets[ticketIndex].count);
					stop.passengers += cnt;
					outputData[stop.tripId].passengers += cnt;
				}
			}
		}

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`Processing data... ${tripIndex + 1}/${Object.keys(stopData).length}`);
	});

	for (const stopArr of Object.values(stopData)) {
		const trip = stopArr[0].tripId;
		const blockId = blockData[trip];
		const vehicles = blockDict[blockId];

		if (vehicles?.length === 0 || vehicles?.length === undefined) continue;

		for (const stop of stopArr) {
			stop.passengers = Math.round(stop.passengers / vehicles.length);
		}

		outputData[trip].passengers = Math.round(outputData[trip].passengers / vehicles.length);
	}

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`Processing data... Done\n`);

	process.stdout.write("Writing files... ");

	fse.ensureDirSync(path.join(__dirname, "output", process.argv[2]));

	const writePromises: Promise<void>[] = [
		new Promise((res, rej) => {
			const flatData = Object.values(stopData).flat();

			csvstringify(flatData, { header: true, columns: Object.keys(flatData[0]) }, (err, output) => {
				if (err) {
					rej();
					return;
				}
		
				fse.writeFileSync(outputStopPath, output, "utf-8");
				
				res();
			});
		}),
		new Promise((res, rej) => {
			const csvData = Object.values(outputData).map((t) => [t.id, t.passengers, t.block]);

			csvstringify(csvData, (err, output) => {
				if (err) {
					rej();
					return;
				}
		
				fse.writeFileSync(outputTripPath, output, "utf-8");
				
				res();
			});
		}),
	];

	await Promise.all(writePromises);

	process.stdout.write("Done\n");
})();
