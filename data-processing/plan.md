1. Minify e-ticket data:
   1. Aggregate all the e-ticket validations of the same minute on the same trip into 1 entry
   2. Add column for e-ticket validation count of the aggregate entry
   3. Convert date to UNIX timestamp and add as separate column
   4. Remove unnecessary columns (Ier_ID, Parks, Transp Veids, MarsrNos, ValidTalonaId, Laiks)
   5. Save the processed data into a new file
2. Define a search interval for each trip (Minimum possible time for an e-ticket validation; Maximum possible time for an e-ticket validation)
3. For every day, filter the relevant trips according to calendar and calendar_days
4. For each block_id (trips.csv):
   1. For each transport ID in a filtered set, where tType and tRoute match block's tType and tRoute  (eticket.csv):
      1. For each e-ticket validation of the transport ID:
         1. If the e-ticket validation timestamp isn't in any trip time intervals, continue to next transport
         2. If the e-ticket validation timestamp matches, but the direction doesn't, continue to next transport
      2. If all e-ticket validations are within the block's trips, add the transport ID as block candidate
5. For every block in block-vehicle-dict:
   1. For every vehicle matched to the block:
      1. Add the e-ticket validation count to a trip according to the validation timestamp

Processing script order:
   1. minifyValidations.ts
   2. defineTripIntervals.ts
   3. filterTrips.ts
   4. matchVehicles.ts
   5. matchValidations.ts

Multiple views:
   - Compare absolute route activity for a single hour
     1. Sum all passengers for each trip on a route which starts during the hour
     2. Calculate the average of all the route trips in the hour
     3. Compare routes by average passenger activity in the hour (Shown on big map)
   - Relative trip activity for a single route
     1. Calculate the sum of all passsengers on the route
     2. Determine the trip with the highest number of passengers
     3. Calculate the relative activity of each trip by comapring it to the most active trip (trip / trip_max)
   - Relative stop activity for a single trip
     1. Calculate the sum of all passsengers on the trip
     2. Determine the stop with the highest number of passengers
     3. Calculate the relative activity of each stop by comapring it to the most active stop (stop / stop_max)