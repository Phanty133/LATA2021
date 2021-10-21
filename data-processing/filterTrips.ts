import csvparse from "csv-parse";
import csvstringify from "csv-stringify";
import fse from "fs-extra";
import path from "path";

const checkDate = new Date(2021, 0, 5);

const tripDataPath = path.join(__dirname, "processed-data", "trip_intervals.csv");
const calendarDataPath = path.join(__dirname, "data", "calendar-01.csv");
const calendarDatesDataPath = path.join(__dirname, "data", "calendar_dates-01.csv");
const outputPath = path.join(__dirname, "processed-data", "trips_filtered-05.01.csv");
const checkDateNum = checkDate.getDate();
const checkDay = checkDate.getDay() === 0 ? 6 : checkDate.getDay() - 1;

interface Trip {
	route_id: string,
	trip_id: string,
	direction_id: number,
	block_id: string,
}

interface Service {
	service_id: string,
	operatingDays: boolean[],
}

interface ServiceException {
	service_id: string,
	date: number,
	type: number, // 1 - Add service, 2 - Remove service
}

(async () => {
	process.stdout.write("Reading input... ");
	const tripParser = csvparse({ delimiter: "," });
	const calendarParser = csvparse({ delimiter: "," });
	const calendarDatesParser = csvparse({ delimiter: "," });

	const tripStream = fse.createReadStream(tripDataPath);
	const calendarStream = fse.createReadStream(calendarDataPath);
	const calendarDatesStream = fse.createReadStream(calendarDatesDataPath);

	tripStream.pipe(tripParser);
	calendarStream.pipe(calendarParser);
	calendarDatesStream.pipe(calendarDatesParser);

	process.stdout.write("Done\n");

	process.stdout.write("Parsing files... ");

	const calendar: Record<string, Service> = {}; // service_id : Serivce
	const serviceExceptions: Record<string, ServiceException> = {}; // service_id : ServiceException
	const outputData: Trip[] = [];

	for await (const calendarRecord of calendarParser) {
		const service_id = calendarRecord[0];
		const operatingDays = [];

		for (let i = 1; i < 8; i++) {
			operatingDays.push(Number(calendarRecord[i]) === 1);
		}

		calendar[service_id] = { service_id, operatingDays };
	}

	for await (const calendarDateRecord of calendarDatesParser) {
		const service_id: string = calendarDateRecord[0];
		const dateRaw: string = calendarDateRecord[1];
		const type: number = Number(calendarDateRecord[2]);
		const date = Number(dateRaw.substring(6, 8));

		serviceExceptions[service_id] = { service_id, type, date };
	}

	process.stdout.write("Done\n");

	process.stdout.write("Processing data... ");

	for await (const tripRecord of tripParser) {
		const service_id: string = tripRecord[5];
		let serviceActiveException = false;

		if (service_id in serviceExceptions) {
			const exception = serviceExceptions[service_id];

			if (exception.date === checkDateNum) {
				if (exception.type === 1) { // The service gets added for this date
					serviceActiveException = true;
				} else if (exception.type === 2) { // The service is removed for this date
					continue;
				}
			} else if (exception.type === 1) { // The service would have been added for that date
				// continue; // ???????
			}
		}

		if (serviceActiveException || calendar[service_id]?.operatingDays[checkDay]) {
			outputData.push(tripRecord);
		}
	}

	process.stdout.write("Done\n");

	process.stdout.write("Writing output... ");

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		await fse.writeFile(outputPath, output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();
