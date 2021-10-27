#!/bin/bash

echo "Processing: $1.$2"

ts-node countRouteValidations.ts $1 $2

# ts-node minifyValidations.ts $1 $2

# if [ "$2" == "1" ]
# then
# 	ts-node defineTripInterval.ts $1 $2
# fi

# ts-node filterTrips.ts $1 $2
# ts-node matchVehicles.ts $1 $2
# ts-node matchValidations.ts $1 $2

rm -rf ./temp/*