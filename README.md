## Data processing script description

- `minifyValidations.ts` - Aggregates similar e-ticket validations from the same minute of the same vehicle
- `filterTrips.ts` - Filters out the trips that don't occur on the given date by service_id
- `defineTripInterval.ts` - Determines the time the trip takes place
- `matchVehicles.ts` - Matches block_id to vehicle ID