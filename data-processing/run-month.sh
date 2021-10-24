#!/bin/bash

for (( i=1; i<=$2; i++ ))
do
	bash run-one.sh $1 $i
done