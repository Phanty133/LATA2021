import csvparse from "csv-parse";
import fse from "fs-extra";
import path from "path";
import csvstringify from "csv-stringify";

const eticketDataPath = path.join(__dirname, "processed-data", "etaloni-01.01.csv");
const tripDataPath = path.join(__dirname, "processed-data", "trip_intervals.csv");
const outputPath = path.join(__dirname, "processed-data", "block-vehicle_dict_01.01.csv");

const maxOutliers = 0;

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

function ticketMatchesBlock(ticket: TicketEntry, block: Block) {
	const filteredTrips = block.trips.filter((t) => t.direction === ticket.direction);

	for (const trip of filteredTrips) {
		if (ticket.timestamp >= trip.minTime - 5 && ticket.timestamp <= trip.maxTime + 5) {
			return true;
		}
	}

	return false;
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

	// Process data
	const vehicleBlockDict: Record<string, string[]> = {}; // blockID : tID[]
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
			}
		}

		if (block.candidates.length === 1) {
			// delete transportData[block.candidates[0]];
		}

		if (block.candidates.length === 0) {
			emptyBlock++;
		}

		vehicleBlockDict[block.blockID] = block.candidates;
	}

	console.log(`Inclusion by outlier: ${inclusionByOutlier}`);
	console.log(`Empty block: ${emptyBlock}`);
	console.log(`Empty filtered transports: ${emptyTransportFilters}`);

	const outputData = Object.keys(vehicleBlockDict).map((id) => [id, ...vehicleBlockDict[id]]);

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		await fse.writeFile(outputPath, output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();

