import csvparse from "csv-parse";
import fse from "fs-extra";
import path from "path";
import csvstringify from "csv-stringify";

const date = new Date(2021, process.argv[2] ? Number(process.argv[2]) : 0, process.argv[3] ? Number(process.argv[3]) : 1);
const dateDayStr: string = date.getDate().toString().length === 1 ? `0${date.getDate()}` : date.getDate().toString();
const monthStr: string = (date.getMonth() + 1).toString().length === 1 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1).toString();
const dateStr = `${dateDayStr}.${monthStr}`;

const eticketDataPath = path.join(__dirname, "temp", `etaloni-${dateStr}.csv`);
const tripDataPath = path.join(__dirname, "temp", `trips_filtered-${dateStr}.csv`);
const outputPath = path.join(__dirname, "temp", `block_vehicle_dict-${dateStr}.dict`);

const maxOutliers = 1;
const maxLowerTimeDeviation = 5;
const maxUpperTimeDeviation = 5;

interface TicketEntry {
	count: number,
	timestamp: number,
	direction: number,
}

interface Transport {
	tickets: TicketEntry[],
	rID: string,
	tID: string,
}

interface Trip {
	direction: number,
	minTime: number,
	maxTime: number
}

interface Block {
	candidates: string[],
	blockID: string,
	trips: Trip[],
	rID: string,
}

function removeFromArray<T>(array: T[], value: T, predicate = (a: T, b:T) => a === b){
	return array.splice(array.findIndex((v) => predicate(v, value)), 1).length > 0;
}

function ticketMatchesBlock(ticket: TicketEntry, block: Block) {
	const filteredTrips = block.trips.filter((t) => t.direction === ticket.direction);

	for (const trip of filteredTrips) {
		if (ticket.timestamp >= trip.minTime - maxLowerTimeDeviation && ticket.timestamp <= trip.maxTime + maxUpperTimeDeviation) {
			return true;
		}
	}

	return false;
}

let vehicleBlockDictMult: Record<string, string[]>;
let vehicleBlockLocations: Record<string, string[]>;

function checkVehicleDuplicates(tIDs: string[]) {
	for (const tID of tIDs) {
		let splice = false;

		if (vehicleBlockLocations[tID].length === 1) {
			const targetBlock = vehicleBlockLocations[tID][0];

			for (const otherId of vehicleBlockDictMult[targetBlock]) {
				removeFromArray(vehicleBlockLocations[otherId], targetBlock);
			}

			vehicleBlockDictMult[targetBlock] = [ tID ];
		}

		for (const blockID of vehicleBlockLocations[tID]) {
			if (vehicleBlockDictMult[blockID].length === 1) {
				splice = true;
				break;
			}
		}

		if (splice) {
			for (const blockID of [...vehicleBlockLocations[tID]]) {
				if (vehicleBlockDictMult[blockID].length !== 1) {
					removeFromArray(vehicleBlockDictMult[blockID], tID);
					removeFromArray(vehicleBlockLocations[tID], blockID);

					if (vehicleBlockDictMult[blockID].length === 1) {
						checkVehicleDuplicates(vehicleBlockDictMult[blockID]);
					}
				}
			}
		}
	}
}

(async () => {
	const eticketDataParser = csvparse({ delimiter: "," });
	const tripDataParser = csvparse({ delimiter: "," });

	const eticketDataStream = fse.createReadStream(eticketDataPath);
	const tripDataStream = fse.createReadStream(tripDataPath);

	eticketDataStream.pipe(eticketDataParser);
	tripDataStream.pipe(tripDataParser);

	// Parse transport data

	const transportData: Record<string, Transport> = {};

	for await (const eticketRecord of eticketDataParser) {
		const tID = eticketRecord[0];
		const ticketEntry: TicketEntry = {
			count: eticketRecord[4],
			timestamp: Number(eticketRecord[3]) % 1440, // Day time in minutes
			direction: eticketRecord[2],
		};
		const rID = eticketRecord[1];

		if (tID in transportData) {
			transportData[tID].tickets.push(ticketEntry);
		} else {
			transportData[tID] = {
				tickets: [ ticketEntry ],
				tID,
				rID,
			};
		}
	}

	console.log(`Vehicles: ${Object.keys(transportData).length}`);

	// Parse trip data

	const blockData: Record<string, Block> = {};

	for await (const tripRecord of tripDataParser) {
		const blockID = tripRecord[2];
		const trip: Trip = {
			direction: tripRecord[1],
			minTime: tripRecord[3],
			maxTime: tripRecord[4],	
		};

		if (blockID in blockData) {
			blockData[blockID].trips.push(trip);
		} else {
			blockData[blockID] = {
				candidates: [],
				blockID,
				trips: [ trip ],
				rID: tripRecord[0],
			}
		}
	}

	console.log(`Blocks: ${Object.keys(blockData).length}`);

	// Process data
	vehicleBlockDictMult = {}; // blockID : tID[]
	vehicleBlockLocations = {}; // tID: blockID[]
	let inclusionByOutlier = 0;
	let emptyBlock = 0;
	let emptyTransportFilters = 0;

	for (const block of Object.values(blockData)) {
		const filteredTransports = Object.values(transportData).filter((t) => t.rID === block.rID);
		
		if (filteredTransports.length === 0) {
			emptyTransportFilters++;
		}

		for (const transport of filteredTransports) {
			let outliers = 0;

			for (const ticket of transport.tickets) {
				if (!ticketMatchesBlock(ticket, block)) {
					outliers++;
				}
			}

			if (outliers <= maxOutliers) {
				if (outliers > 0) {
					inclusionByOutlier++;
				}
				
				block.candidates.push(transport.tID);

				if (transport.tID in vehicleBlockLocations) {
					vehicleBlockLocations[transport.tID].push(block.blockID);
				} else {
					vehicleBlockLocations[transport.tID] = [block.blockID];
				}
			}
		}

		if (block.candidates.length === 0) {
			emptyBlock++;
		}

		vehicleBlockDictMult[block.blockID] = block.candidates;
	}

	console.log(`Matched vehicles: ${Object.keys(vehicleBlockLocations).length}`);
	console.log(`Matched blocks: ${Object.keys(vehicleBlockDictMult).length - emptyBlock}`);
	console.log(`Inclusion by outlier: ${inclusionByOutlier}`);
	console.log(`Empty blocks: ${emptyBlock}`);
	console.log(`Blocks without possible transports: ${emptyTransportFilters}`);

	checkVehicleDuplicates(Object.keys(vehicleBlockLocations));

	// jank
	for (const block of Object.keys(vehicleBlockDictMult)) {
		vehicleBlockDictMult[block].splice(0, 0, vehicleBlockDictMult[block].length.toString());
	}

	const outputData = Object.keys(vehicleBlockDictMult).map((id) => [id, ...vehicleBlockDictMult[id]]);

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		await fse.writeFile(outputPath, output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();
