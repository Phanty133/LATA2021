import xlsx from "xlsx";
import path from "path";
import fse from "fs-extra";
import csvstringify from "csv-stringify";

const fileName = "etaloni-01.01.xlsx";
const inputDir = path.join(__dirname, "data", );
const outputDir = path.join(__dirname, "processed-data");

function excelDateToUnix(excelDate: number) {
	return Math.floor((excelDate - 25569) * 86400); // 25569 is the days since 01.01.1900
}

function getUnixMinute(timestamp: number) {
	return Math.floor(timestamp / 60);
}

interface AggregateValidation {
	timestamp: number,
	tID: number,
	route: string,
	routeDir: number,
	count: number,
}

(() => {
	process.stdout.write("Reading XLSX... ");
	const fileData = xlsx.readFile(path.join(inputDir, fileName));
	process.stdout.write("Done\n");

	process.stdout.write("Parsing data... ");
	const data = fileData.Sheets[fileData.SheetNames[0]];
	let row = 2;

	while(data[`A${row}`]) {
		row++
	};

	const totalRows = row - 1;

	process.stdout.write("Done\n");

	process.stdout.write("Processing data... ");
	row = 2;
	const aggregateValidations: Record<number, Record<number, AggregateValidation>> = {}; // TransportID : { Timestamp : Validations }

	while (data[`A${row}`]) {
		const tID = data[`D${row}`].v as number;
		const route = data[`F${row}`].v as string;
		const routeDir = data[`G${row}`].v === "Forth" ? 1 : 0;
		const minTimestamp = getUnixMinute(excelDateToUnix(data[`I${row}`].v));

		if (tID in aggregateValidations) {
			if (minTimestamp in aggregateValidations[tID]) {
				aggregateValidations[tID][minTimestamp].count++;
			} else {
				aggregateValidations[tID][minTimestamp] = {
					tID,
					route,
					routeDir,
					timestamp: minTimestamp,
					count: 1,
				};
			}
		} else {
			aggregateValidations[tID] = {};
			aggregateValidations[tID][minTimestamp] = {
				tID,
				route,
				routeDir,
				timestamp: minTimestamp,
				count: 1,
			};
		}

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`Processing data... ${row} / ${totalRows}`);

		row++;
	}

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(`Processing data... Done\n`);

	process.stdout.write("Writing output... ");
	const outputData = Object.values(aggregateValidations).map((e) => Object.values(e)).flat();
	console.log(outputData[0]);

	csvstringify(outputData, async (err, output) => {
		if (err) throw err;

		const outFileName = `${path.basename(fileName, ".xlsx")}.csv`;
		await fse.writeFile(path.join(outputDir, outFileName), output, "utf-8");
		
		process.stdout.write("Done\n");
	});
})();