1. Minify e-ticket data:
   1. Aggregate all the e-ticket validations of the same minute on the same trip into 1 entry
   2. Add column for e-ticket validation count of the aggregate entry
   3. Convert date to UNIX timestamp and add as separate column
   4. Remove unnecessary columns (Ier_ID, Parks, Transp Veids, MarsrNos, ValidTalonaId, Laiks)
   5. Save the processed data into a new file
2. Define a search interval for each trip (Minimum possible time for an e-ticket validation; Maximum possible time for an e-ticket validation)
3. For each block_id (trips.csv):
   1. For each transport ID in a filtered set, where tType and tRoute match block's tType and tRoute  (eticket.csv):
      1. For each e-ticket validation of the transport ID:
         1. If the e-ticket validation timestamp isn't in any trip time intervals, continue to next transport
         2. If the e-ticket validation timestamp matches, but the direction doesn't, continue to next transport
      2. If all e-ticket validations are within the block's trips, add the transport ID as block candidate