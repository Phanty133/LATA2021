import React from 'react';
import './App.css';
import L, { LatLng, Polyline } from "leaflet";

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
	lineMap: Map<string, Polyline> = new Map<string, Polyline>();

	constructor(props: Propane) {
		super(props);

		this.state = {
			date: new Date("2021-01-01"),
			hour: new Date().getHours(),
			autoHour: false,
			currMenu: OpenableMenus.NONE
		};
		setInterval(this.updateThing.bind(this), 1000);
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
		this.showRoute([new LatLng(56.94606, 24.13001), new LatLng(56.94604, 24.12979), new LatLng(56.94602, 24.12920), new LatLng(56.94597, 24.12590), new LatLng(56.94706, 24.12555)], 0.333, "Swag Bus", "sbus");
		this.showRoute([new LatLng(56.94476, 24.12039), new LatLng(56.94492, 24.12053), new LatLng(56.94451, 24.12119), new LatLng(56.94396, 24.12229), new LatLng(56.94290, 24.12065)], 0.666, "Swag Bus 2", "sbus2");
	}

	getColour(between: number) {
		return "rgb(" + (255 * (1 - between)) + "," + (255 * between) + ",0)";
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
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, -2)
				});
			}
		});
	}

	onRouteHoverOff(id: string) {
		this.lineMap.forEach((v, k) => {
			if (k !== id) {
				v.setStyle({
					color: this.changeLight(this.lineMap.get(k)!.options.color!, 2)
				});
			}
		});
	}

	showRoute(shape: LatLng[], activity: number, name: string, id: string) {
		let polyline = L.polyline(shape, { color: this.getColour(activity), weight: 10 })
			.bindTooltip(name, { sticky: true })
			.addTo(this.map!);
		this.lineMap.set(id, polyline);
		polyline
			.addEventListener("mouseover", () => { this.onRouteHoverOn(id) })
			.addEventListener("mouseout", () => { this.onRouteHoverOff(id) });
	}

	updateThing() {
		if (this.state.autoHour) {
			this.setState({
				date: this.state.date,
				hour: this.state.hour + 1 > 23 ? 0 : this.state.hour + 1,
				autoHour: this.state.autoHour,
				currMenu: this.state.currMenu
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
				currMenu: menuType
			});
		} else {
			this.setState({
				date: this.state.date,
				hour: this.state.hour,
				autoHour: this.state.autoHour,
				currMenu: OpenableMenus.NONE
			});
		}
	}

	render() {
		return (
			<div className="App">
				<div id="map" />
				<div id="GUI">
					<input type="date" id="selectDate" min="2021-01-01" max="2021-01-31" value={this.state.date.toISOString().split('T')[0]} onChange={(e) => {
						this.setState({
							date: new Date(e.target.value!),
							hour: this.state.hour,
							autoHour: this.state.autoHour,
							currMenu: this.state.currMenu
						})
					}} />
					<h1 id="time">{this.state.hour}:00</h1>
					<input type="checkbox" id="autoHour" value={this.state.autoHour} onChange={(e) => {
						this.setState({
							date: this.state.date,
							hour: this.state.hour,
							autoHour: e.target.checked,
							currMenu: this.state.currMenu
						})
					}} />
					<input type="range" id="selectHour" min={0} max={23} value={this.state.hour} onChange={(e) => {
						this.setState({
							date: this.state.date,
							hour: e.target.valueAsNumber,
							autoHour: this.state.autoHour,
							currMenu: this.state.currMenu
						})
					}} />
					<div id="transportTypes">
						Bus <input type="checkbox" /><br />
						Tram <input type="checkbox" /><br />
						Trolleybus <input type="checkbox" /><br />
					</div>
					<div id="routeList" className="listClose">
						<input id="routeDrawer" value={"R\nO\nU\nT\nE\nS"} type="button" onClick={() => { this.openMenu(OpenableMenus.ROUTE) }} />
						<div id="actualRouteList">
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
							agga<br />
						</div>
					</div>
					<div id="tripList" className="listClose">
						<input id="tripDrawer" value={"T\nR\nI\nP\nS"} type="button" onClick={() => { this.openMenu(OpenableMenus.TRIP) }} />
						<div id="actualTripList">

						</div>
					</div>
					<div id="stopList" className="listClose">
						<input id="stopDrawer" value={"S\nT\nO\nP\nS"} type="button" onClick={() => { this.openMenu(OpenableMenus.STOP) }} />
						<div id="actualStopList">

						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default App;
