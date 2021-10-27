// This is stolen from an another thing I did :)
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import SVGIconOptions from "./SVGIconOptions";

export class SVGIcon extends L.DivIcon {
	options: SVGIconOptions = {
		color: "rgb(255,255,255)",
		iconAnchor: new L.Point(0, 0),
		tooltipAnchor: new L.Point(0, 0),
		iconSize: new L.Point(32, 48),
		opacity: 1,
		popupAnchor: new L.Point(0, 0),
		shadowAngle: 45,
		shadowBlur: 1,
		shadowColor: "rgb(0,0,10)",
		shadowEnable: false,
		shadowLength: 0.75,
		shadowOpacity: 0.5,
		shadowTranslate: new L.Point(0, 0),
		weight: 2,
		className: "svgicon",
		iconUrl: undefined,
		svgLink: undefined,
		interactable: false
	};

	constructor(options?: any) {
		super(options);
		options = L.Util.setOptions(this, options);

		this.options.html = this._createSVG();
	}

	private _createSVG(): HTMLObjectElement {
		const resEl = document.createElement("object") as HTMLObjectElement;
		resEl.setAttribute("data", this.options.svgLink!);

		resEl.addEventListener("load", (ev) => {
			resEl.style.setProperty("pointer-events", "none");
			if (this.options.interactable) resEl.getSVGDocument()!.querySelector("svg")!.style.cursor = "pointer";
			resEl.getSVGDocument()!.querySelector("svg")!.setAttribute("width", this.options.iconSize.x.toString() + "px");
			resEl.getSVGDocument()!.querySelector("svg")!.setAttribute("height", this.options.iconSize.y.toString() + "px");
			this.setColor(this.options.color);
		});

		return resEl;
	}

	setColor(newColor: string) {
		this.options.color = newColor;

		const innerSVAG = (this.options.html as HTMLObjectElement).getSVGDocument();

		if (!innerSVAG) return;

		const pathAr = innerSVAG.getElementsByTagNameNS("http://www.w3.org/2000/svg", "path");
		const paths: SVGElement[] = Object.values(pathAr);

		for (const path of paths) {
			if (path.hasAttribute("iconColorIgnore")) continue;

			path.style.setProperty("fill", newColor);
			path.style.setProperty("opacity", this.options.opacity.toString());
		}

		const rectAr = innerSVAG.getElementsByTagNameNS("http://www.w3.org/2000/svg", "rect");
		const rects: SVGElement[] = Object.values(rectAr);

		for (const rect of rects) {
			if (rect.hasAttribute("iconColorIgnore")) continue;

			rect.style.setProperty("fill", newColor);
			rect.style.setProperty("opacity", this.options.opacity.toString());
		}
	}
}