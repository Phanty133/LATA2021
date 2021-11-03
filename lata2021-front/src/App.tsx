import React from 'react';
import './App.css';
import L, { LatLng, Polyline, LayerGroup, Point, LatLngBounds, Marker } from "leaflet";
import { SVGIcon } from "./SVGIcon";
import MarkerSVG from "./marker.svg";

interface Propane {
}

enum OpenableMenus {
	NONE,
	ROUTE,
	TRIP,
	STOP
}


class App extends React.Component<Propane, any> {
	map: L.Map | null = null;
	dayMax: number = 1;
	lineMap: Map<string, Polyline> = new Map<string, Polyline>();
	routes: Map<string, LatLng[]> = new Map<string, LatLng[]>();
	names: Map<string, string[]> = new Map<string, string[]>(); //0 short 1 long
	types: Map<string, number> = new Map<string, number>();
	bus: LayerGroup = new LayerGroup();
	tram: LayerGroup = new LayerGroup();
	trolleybus: LayerGroup = new LayerGroup();
	markerGroup: LayerGroup = new LayerGroup();

	constructor(props: Propane) {
		super(props);

		this.state = {
			date: new Date("2021-01-01"),
			hour: new Date().getHours(),
			autoHour: false,
			currMenu: OpenableMenus.NONE,
			currSelect: "",
			relativeDay: true
		};
		setInterval(this.updateThing.bind(this), 500);
	}

	componentDidMount() {
		if (this.map == null) {
			this.map = L.map('map', {
				center: [56.95, 24.11],
				maxBounds: [[57.21, 23.20], [56.75, 24.66]],
				zoom: 13
			});
		}
		let Jawg_Dark = L.tileLayer('https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
			attribution: '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			minZoom: 14,
			maxZoom: 18,
			subdomains: 'abcd',
			accessToken: 'iKbn4srGwDR8o2IxGUP8skNZ8T7AVxUrCiBvpwxYzLLRtSGXGhlY9W20wBr182yM'
		});
		Jawg_Dark.addTo(this.map);
		this.markerGroup.addTo(this.map);
		// this.setUpRoutes();
		this.cacheRoutes();
		this.bus.addTo(this.map!);
		(document.getElementById("busCheck")! as HTMLInputElement).checked = true;
	}

	cacheRoutes() {
		var requestInit: RequestInit = {
			mode: "cors",
			method: "GET"
		};
		fetch(`https://busify.herokuapp.com/api/data/routes?simpleShape=true`, requestInit)
			.then((response) => response.json())
			.then((response: any[]) => {
				response.forEach(a => {
					this.routes.set(a.routeId, a.shape);
					this.names.set(a.routeId, [a.shortName, a.longName]);
					this.types.set(a.routeId, a.type);
				});
			}).then(() => {
				this.setUpRoutes();
			});
	}

	setUpRoutes() {
		let hour = this.state.hour;
		let day = (this.state.date as Date).getDate();
		let month = (this.state.date as Date).getMonth();
		var requestInit: RequestInit = {
			mode: "cors",
			method: "GET"
		};
		fetch(`https://busify.herokuapp.com/api/activity/routeMax?month=${month + 1}&day=${day}`, requestInit)
			.then((response) => response.json())
			.then((response: any) => {
				this.dayMax = response.max;
			}).then(() => {
				fetch(`https://busify.herokuapp.com/api/activity/routes?month=${(this.state.date as Date).getMonth() + 1}&day=${(this.state.date as Date).getDate()}&hour=${this.state.hour}&simpleShape=true`, requestInit)
					.then((response) => response.json())
					.then((response: any[]) => {
						if (hour !== this.state.hour || day !== (this.state.date as Date).getDate() || month !== (this.state.date as Date).getMonth()) return;
						this.bus.clearLayers();
						this.tram.clearLayers();
						this.trolleybus.clearLayers();
						response.forEach((a) => {
							let id = a.id;
							let passengers = this.state.relativeDay ? a.passengers / this.dayMax : a.relativeActivity;
							if (this.names.get(id) === undefined) return;
							let name = this.names.get(id)![1];
							let num = this.names.get(id)![0];
							let type = this.types.get(id)!;
							let shape = this.routes.get(id)!;
							if (shape === undefined) return;
							this.showRoute(shape, passengers, "(" + num + ") " + name + "<br/>" + a.passengers + " passengers", id, type);
						});
					});
			});
	}

	generateStopRoute(routeId: string, routePath: Polyline) {
		let stopPoints: LatLng[] = [];
		let amountsPerStop: number[] = [];
		var requestInit: RequestInit = {
			mode: "cors",
			method: "GET"
		};
		if (this.state.currSelect !== "") {
			this.clearer();
			return;
		}
		fetch(`https://busify.herokuapp.com/api/activity/stops?month=${(this.state.date as Date).getMonth() + 1}&day=${(this.state.date as Date).getDate()}&hour=${this.state.hour}&client=true&route=${routeId}`, requestInit)
			.then((response) => response.json())
			.then((response: any[]) => {
				this.markerGroup.clearLayers();
				response.forEach((a) => {
					// stopPoints.push(a.coord as LatLng);
					// amountsPerStop.push(a.relativeActivity);
					this.setState({
						date: this.state.date,
						hour: this.state.hour,
						autoHour: this.state.autoHour,
						currMenu: this.state.currMenu,
						currSelect: routeId
					});
					//this.forceDarken(routeId);
					let marker = new Marker(a.coord, {
						icon: new SVGIcon({
							svgLink: MarkerSVG,
							iconAnchor: [16, 16],
							iconSize: new L.Point(32, 32),
							color: this.getColour(a.relativeActivity)
						})
					})
						// .bindTooltip("Passengers: " + a.passengers)
						.addTo(this.markerGroup);
				});
				return "swag";
			}).then(a => {
				// let endRes = new Map<LatLng[], number>();
				// let lngs = routePath.getLatLngs() as LatLng[];
				// for (let x = 0; x < stopPoints.length - 1; x++) {
				// 	let point1 = this.map!.layerPointToLatLng(routePath.closestLayerPoint(this.map!.latLngToLayerPoint(stopPoints[x])));
				// 	let point2 = this.map!.layerPointToLatLng(routePath.closestLayerPoint(this.map!.latLngToLayerPoint(stopPoints[x + 1])));
				// 	let cool: LatLng[] = [];
				// 	console.table(lngs.indexOf([...lngs].sort((a, b) => { return point1.distanceTo(a) - point1.distanceTo(b) })[0]) - lngs.indexOf([...lngs].sort((a, b) => { return point2.distanceTo(a) - point2.distanceTo(b) })[0]) + 1);
				// 	for (let y = lngs.indexOf([...lngs].sort((a, b) => { return point1.distanceTo(a) - point1.distanceTo(b) })[0]); y < lngs.indexOf([...lngs].sort((a, b) => { return point2.distanceTo(a) - point2.distanceTo(b) })[0]) + 1; y++) {
				// 		cool.push(lngs[y]);
				// 	}
				// 	endRes.set(cool, amountsPerStop[x]);
				// }
				// this.paintSegments(endRes);
			});
	}

	paintSegments(segmentData: Map<LatLng[], number>) {
		segmentData.forEach((v, k) => {
			let polyline = L.polyline(k, { color: this.getColour(v), weight: 10, opacity: 0.5 });
			polyline.addTo(this.map!);
			// this.lineMap.set(id, polyline);
		});
	}

	getColour(between: number) {
		let act = Math.log(100 * between + 1) / Math.log(100);
		return "rgb(" + (255 * act) + "," + (255 * (1 - act)) + ",0)";
	}

	changeLight(colour: string, amount: number) {
		let colourDiv: string[] = colour.split(',');
		if (colourDiv.length !== 3) throw new Error("Invalid Colour");
		colourDiv[0] = colourDiv[0].substring(4);
		colourDiv[2] = colourDiv[2].replace(')', '');
		let colourReal: number[] = colourDiv.map(x => parseInt(x));
		if (amount >= 0) {
			return `rgb(${colourReal[0] * amount},${colourReal[1] * amount},${colourReal[2] * amount})`;
		} else {
			return `rgb(${colourReal[0] / -amount},${colourReal[1] / -amount},${colourReal[2] / -amount})`;
		}
	}

	onRouteHoverOn(id: string) {
		// if (this.state.currSelect !== "") return;
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, -2),
					opacity: 0.1
				});
			} else {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, 2),
					opacity: 1
				});
			}
		});
	}

	forceDarken(id: string) {
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, -2),
					opacity: 0.1
				});
			}
		});
	}

	onRouteHoverOff(id: string) {
		// if (this.state.currSelect !== "") return;
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, 2),
					opacity: 0.5
				});
			} else {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, -2),
					opacity: 0.5
				});
			}
		});
	}

	forceUndarken(id: string) {
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, 2),
					opacity: 0.5
				});
			}
		});
	}

	showRoute(shape: LatLng[], activity: number, name: string, id: string, type: number) {
		let polyline = L.polyline(shape, { color: this.getColour(activity), weight: 10, opacity: 0.5 })
			.bindTooltip(name, { sticky: true });
		polyline
			.addEventListener("mouseover", () => { this.onRouteHoverOn(id) })
			.addEventListener("mouseout", () => { this.onRouteHoverOff(id) })
			.addEventListener("click", () => { this.generateStopRoute(id, this.lineMap.get(id)!) });
		this.lineMap.set(id, polyline);
		switch (type) {
			case 0:
				this.bus.addLayer(polyline);
				break;
			case 1:
				this.trolleybus.addLayer(polyline);
				break;
			case 2:
				this.tram.addLayer(polyline);
				break;
		}
	}

	updateThing() {
		if (this.state.autoHour) {
			let _ = this.state.hour + 1 > 23 ? (this.state.date as Date).getDate() + 1 > 31 ? (this.state.date as Date).setDate(1) : (this.state.date as Date).setDate((this.state.date as Date).getDate() + 1) : this.state.date;
			this.setState({
				date: this.state.date,
				hour: this.state.hour + 1 > 23 ? 0 : this.state.hour + 1,
				autoHour: this.state.autoHour,
				currMenu: this.state.currMenu,
				currSelect: this.state.currSelect,
				relativeDay: this.state.relativeDay
			}, () => {
				this.setUpRoutes();
			});
		}
	}

	openMenu(menuType: OpenableMenus) {
		switch (this.state.currMenu) {
			case OpenableMenus.ROUTE:
				document.getElementById("routeList")?.classList.remove("listOpen");
				document.getElementById("routeList")?.classList.add("listClose");
				break;
			case OpenableMenus.TRIP:
				document.getElementById("tripList")?.classList.remove("listOpen");
				document.getElementById("tripList")?.classList.add("listClose");
				break;
			case OpenableMenus.STOP:
				document.getElementById("stopList")?.classList.remove("listOpen");
				document.getElementById("stopList")?.classList.add("listClose");
				break;
		}
		if (menuType !== this.state.currMenu) {
			switch (menuType) {
				case OpenableMenus.ROUTE:
					document.getElementById("routeList")?.classList.remove("listClose");
					document.getElementById("routeList")?.classList.add("listOpen");
					break;
				case OpenableMenus.TRIP:
					document.getElementById("tripList")?.classList.remove("listClose");
					document.getElementById("tripList")?.classList.add("listOpen");
					break;
				case OpenableMenus.STOP:
					document.getElementById("stopList")?.classList.remove("listClose");
					document.getElementById("stopList")?.classList.add("listOpen");
					break;
			}
			this.setState({
				date: this.state.date,
				hour: this.state.hour,
				autoHour: this.state.autoHour,
				currMenu: menuType,
				currSelect: this.state.currSelect,
				relativeDay: this.state.relativeDay
			});
		} else {
			this.setState({
				date: this.state.date,
				hour: this.state.hour,
				autoHour: this.state.autoHour,
				currMenu: OpenableMenus.NONE,
				currSelect: this.state.currSelect,
				relativeDay: this.state.relativeDay
			});
		}
	}

	clearer() {
		// this.forceUndarken(this.state.currSelect);
		this.setState({
			date: this.state.date,
			hour: this.state.hour,
			autoHour: this.state.autoHour,
			currMenu: this.state.currMenu,
			currSelect: "",
			relativeDay: this.state.relativeDay
		});
		this.markerGroup.clearLayers();
	}

	render() {
		return (
			<div className="App">
				<div id="map" />
				<div id="GUI">
					<input type="date" id="selectDate" required={true} min="2021-01-01" max="2021-01-31" value={this.state.date.toISOString().split('T')[0]} onChange={(e) => {
						this.setState({
							date: new Date(e.target.value!),
							hour: this.state.hour,
							autoHour: this.state.autoHour,
							currMenu: this.state.currMenu,
							currSelect: this.state.currSelect,
							relativeDay: this.state.relativeDay
						}, () => {
							this.setUpRoutes();
						});
					}} />
					<h1 id="time">{this.state.hour}:00</h1>
					<div className="autoHourDiv">
						<input type="checkbox" id="autoHour" value={this.state.autoHour} onChange={(e) => {
							this.setState({
								date: this.state.date,
								hour: this.state.hour,
								autoHour: e.target.checked,
								currMenu: this.state.currMenu,
								currSelect: this.state.currSelect,
								relativeDay: this.state.relativeDay
							});
						}} />
						<label htmlFor="autoHour"></label>
					</div>
					<input type="range" id="selectHour" className="range" min={0} max={23} value={this.state.hour} onChange={(e) => {
						this.setState({
							date: this.state.date,
							hour: e.target.valueAsNumber,
							autoHour: this.state.autoHour,
							currMenu: this.state.currMenu,
							currSelect: this.state.currSelect,
							relativeDay: this.state.relativeDay
						}, () => {
							this.setUpRoutes();
						});
					}} />
					<div id="transportTypes">
						<div className="transportTypes">
							Bus <input type="checkbox" onChange={(e) => {
								if (e.target.checked) this.bus.addTo(this.map!);
								else this.bus.removeFrom(this.map!);
								this.clearer();
							}} id="busCheck" /><br />
							Tram <input type="checkbox" onChange={(e) => {
								if (e.target.checked) this.tram.addTo(this.map!);
								else this.tram.removeFrom(this.map!);
								this.clearer();
							}} /><br />
							Trolleybus <input type="checkbox" onChange={(e) => {
								if (e.target.checked) this.trolleybus.addTo(this.map!);
								else this.trolleybus.removeFrom(this.map!);
								this.clearer();
							}} />
						</div><br /><br />
						<div className="betweenStuf">Relative to<input className="tgl tgl-flip" id="cb5" checked={this.state.relativeDay} onChange={(e) => {
							this.setState({
								date: this.state.date,
								hour: this.state.hour,
								autoHour: this.state.autoHour,
								currMenu: this.state.currMenu,
								currSelect: this.state.currSelect,
								relativeDay: e.target.checked
							}, () => {
								this.setUpRoutes();
							});
						}} type="checkbox" /><label className="tgl-btn" data-tg-off="Hour" data-tg-on="Day" htmlFor="cb5"></label></div><br />
					</div>
					<div id="routeList" className="listClose">
						<input id="routeDrawer" value={"R\nO\nU\nT\nE\nS"} type="button" hidden onClick={() => { this.openMenu(OpenableMenus.ROUTE) }} />
						<div id="actualRouteList">
						</div>
					</div>
					<div id="tripList" className="listClose">
						<input id="tripDrawer" value={"T\nR\nI\nP\nS"} type="button" hidden onClick={() => { this.openMenu(OpenableMenus.TRIP) }} />
						<div id="actualTripList">

						</div>
					</div>
					<div id="stopList" className="listClose">
						<input id="stopDrawer" value={"S\nT\nO\nP\nS"} type="button" hidden onClick={() => { this.openMenu(OpenableMenus.STOP) }} />
						<div id="actualStopList">

						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default App;
