1. Minify e-ticket data:
   1. Aggregate all the e-ticket validations of the same minute on the same trip into 1 entry
   2. Add column for e-ticket validation count of the aggregate entry
   3. Convert date to UNIX timestamp and add as separate column
   4. Remove unnecessary columns (Ier_ID, Parks, Transp Veids, MarsrNos, ValidTalonaId, Laiks)
   5. Save the processed data into a new file