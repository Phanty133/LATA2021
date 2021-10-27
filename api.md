# APIs
## Static data API
### **GET** `/api/data/routes` Returns the available routes
#### Returns
```
	[
		{
			routeId: string, // The route ID
			shape: { // The shape data of the route, Typical RoutePath values are "a-b" and "b-a"
				<RoutePath>: [[Lat, Lng], ...],
				...
			},
			longName: string, The full name of the route, e.g. Pēternieki - Brīvības iela
			shortName: string, The short name of the route, e.g. 23, 40, etc.
			type: number, Transport type: 0 - Bus, 1 - Trolleybus, 2 - Tram, 
			url: string, // CLIENT ONLY - Rigas Satiksmes URL to the route
		}
	]
```

### **GET** `/api/data/trips` Returns the trips of a route (Not sure if necessary)
#### Parameters
- `month` - INT - 0-11
- `day` - INT - 1-31
- `route` - STRING - Route ID
#### Returns
```
	[
		{
			id: string, // The trip ID
			direction: number, // 0 - Forth, 1 - Back
		}
	]
```

### **GET** `/api/data/stops` Returns the stops of a trip if given parameter `trip` or data about specific stops if given parameter `stops` 
#### Parameters
- `trip` - STRING - EXCLUSIVE WITH `stops` - Trip ID
- `stops` - STRING - EXCLUSIVE WITH `trip` - Comma separated string of stop IDs
#### Returns
```
	[
		{
			stopId: string, // The stop ID
			name: string, // Name of the stop,
			coord: number[], // [Lat, Lng]
		}
	]
```

### **GET** `/api/data/stopTimes` Returns the timestamps of when a transport enters the specified stops or all stops on a trip
#### Parameters
- `trip` - STRING - Trip ID
#### Returns
```
	[
		{
			tripId: string, // The trip ID
			stopId: string, // The stop ID 
			sequence: number, // Which stop in sequence it is (in the given trip)
			arrival: number, // The minute of the day when the transport enters, e.g. 3:05AM = 3 * 60 + 5 = 185
		}
	]
```
## Activity API
### **GET** `/api/activity/routes` Returns the route activity during the hour 
#### Parameters
- `month` - INT - 0-11
- `day` - INT - 1-31
- `hour` - INT - OPTIONAL - 0 - 23, If not given, returns passengers for all hours
- `client` - BOOL - OPTIONAL - If `true`, includes client-only data, default: `false`
#### Returns 
```
	[
		{
			id: string, // The route ID
			passengers: number | number[], // Relative activity of the route for the hour if given parameter "hour" or an array of all activity for the day
			shape: [], // CLIENT ONLY - The shape data of the route
			longName: string, // CLIENT ONLY - The full name of the route, e.g. Pēternieki - Brīvības iela
			shortName: string, // CLIENT ONLY - The short name of the route, e.g. 23, 40, etc.
			type: number, // CLIENT ONLY - Transport type: 0 - Bus, 1 - Trolleybus, 2 - Tram, 
			url: string, // CLIENT ONLY - Rigas Satiksmes URL to the route
		}
	]
```

### **GET** `/api/activity/trips` Returns the trip activity of all trips on a route (if given parameter `route`) or a single trip (if given parameter `trip`)
#### Parameters
- `month` - INT - 0-11
- `day` - INT - 1-31
- `route` - STRING - EXCLUSIVE WITH `trip` - Route ID
- `trip` - STRING - EXCLUSIVE WITH `route` - Trip ID
- `client` - BOOL - If `true`, includes client-only data, default: `false`
#### Returns
```
	[
		{
			id: string, // The trip ID
			routeId: string, // The route ID
			activity: number, // Relative activity of the trip
			name: string, // CLIENT ONLY - The name of the trip with the correct direction
			direction: number, // CLIENT ONLY - 0 - Forth, 1 - Back
		}
	]
```

### **GET**`/api/activity/stops`
#### Parameters
- `month` - INT - 0-11
- `day` - INT - 1-31
- `trip` - STRING - Trip ID
- `client` - BOOL - If `true`, includes client-only data, default: `false`
#### Returns
```
	[
		{
			id: string, // The stop ID
			activity: number, // Relative activity of the stop
			name: string, // CLIENT ONLY - The name of the stop
		}
	]
```