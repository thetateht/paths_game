// Draws the map (from data/map/*.json) as SVG and colors countries.
import { parseRings, boxOf, routeBox, twoRoutesBox } from "./framing.js";
import { t } from "./texts.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const MARGIN = 0.2; // space around fitted countries, as a part of the larger side
const COUNTRY_MARGIN = 0.4; // Neighbors mode: more space around the one country
const COUNTRY_MIN_SIZE = 30; // Neighbors mode: smallest view (tiny Liechtenstein: neighbors)
const ZOOM_STEP = 1.2; // zoom per mouse wheel step
const MIN_VIEW = 13.7; // map units (~200 km wide): the closest zoom
const MIN_SIZE = 80; // smallest view (map units), so tiny countries are not zoomed too much
const STATES = ["start", "target", "on-way", "off-way", "missed", "unneeded"];
const STRIPES_PER_VIEW = 120; // stripes of "missed" / "unneeded" countries across the view width

// [lon, lat] in degrees -> point on a unit sphere [x, y, z]
function toXyz([lon, lat]) {
  const l = (lon * Math.PI) / 180;
  const f = (lat * Math.PI) / 180;
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
}

// Loads the map version centered nearest to the given countries.
export async function loadMapFor(codes) {
  const index = await (await fetch("data/map/index.json")).json();
  // Middle of the countries on the globe (average of their 3D points)
  const mid = [0, 0, 0];
  for (const c of codes) {
    toXyz(index.centroids[c]).forEach((v, i) => (mid[i] += v));
  }
  // Nearest center = largest dot product with the middle
  const dot = (p) => toXyz(p).reduce((sum, v, i) => sum + v * mid[i], 0);
  const [lon, lat] = index.centers.reduce((best, c) => (dot(c) > dot(best) ? c : best));
  return (await fetch(`data/map/map_${lon}_${lat}.json`)).json();
}

// Creates the SVG with one <path> per country; returns the map object.
// names: {code: name}, shown on hover only for colored countries;
// playable: set of codes in the game (others are grayed);
// blank: only land and sea, borders shown only around colored countries (see CSS)
export function createMap(container, mapData, names, playable, blank = false) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("map");
  svg.classList.toggle("blank", blank);
  let view = { x0: 0, y0: 0, x1: mapData.size, y1: mapData.size };

  // Diagonal stripes (see CSS): "missed" = green on land, "unneeded" = green on olive;
  // size set with the view
  const defs = document.createElementNS(SVG_NS, "defs");
  const stripes = ["missed", "unneeded"].map((name) => {
    const pattern = document.createElementNS(SVG_NS, "pattern");
    pattern.id = `${name}-stripes`;
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("patternTransform", "rotate(45)");
    const background = document.createElementNS(SVG_NS, "rect");
    background.classList.add(`${name}-background`);
    const line = document.createElementNS(SVG_NS, "rect");
    line.classList.add("stripes-line");
    pattern.append(background, line);
    defs.append(pattern);
    return { pattern, background, line };
  });
  svg.append(defs);

  const shapes = {};
  const rings = {}; // outlines, parsed when needed
  for (const [code, d] of Object.entries(mapData.countries)) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.classList.add("country");
    if (!playable.has(code)) path.classList.add("off");
    svg.append(path);
    shapes[code] = path;
  }
  container.append(svg);
  showView();

  // Zoom (mouse wheel, around the cursor) and moving (dragging); a button brings back the
  // fitted view (home)
  let home = view;
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn btn-return map-reset";
  reset.textContent = t("map_reset");
  reset.hidden = true;
  reset.addEventListener("click", () => {
    view = home;
    changed();
  });
  container.append(reset);

  // Point of the map under the mouse (works with the game's CSS zoom, too)
  const toMap = (event) =>
    new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault(); // no page scrolling
      const p = toMap(event);
      const width = view.x1 - view.x0;
      const wanted = width * (event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
      const k = Math.min(Math.max(wanted, MIN_VIEW), mapData.size) / width;
      view = {
        x0: p.x - (p.x - view.x0) * k,
        y0: p.y - (p.y - view.y0) * k,
        x1: p.x + (view.x1 - p.x) * k,
        y1: p.y + (view.y1 - p.y) * k,
      };
      changed();
    },
    { passive: false }
  );

  let drag = null; // {x, y, view, scale} at the start of dragging
  svg.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, view, scale: svg.getScreenCTM().a };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = (event.clientX - drag.x) / drag.scale;
    const dy = (event.clientY - drag.y) / drag.scale;
    const v = drag.view;
    view = { x0: v.x0 - dx, y0: v.y0 - dy, x1: v.x1 - dx, y1: v.y1 - dy };
    changed();
  });
  const endDrag = () => {
    drag = null;
    svg.classList.remove("dragging");
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  // After zooming or moving: show it; the reset button only away from the fitted view
  function changed() {
    showView();
    reset.hidden = view === home;
  }

  const ringsOf = (code) => (rings[code] ??= parseRings(mapData.countries[code]));

  // The view on the box: margin (a part of the larger side), smallest size, frame shape
  function fitBox({ x0, y0, x1, y1 }, margin, minSize) {
    const size = Math.max(x1 - x0, y1 - y0, minSize);
    const pad = size * margin;
    let w = Math.max(x1 - x0, minSize) + 2 * pad;
    let h = Math.max(y1 - y0, minSize) + 2 * pad;
    const frame = svg.clientWidth / svg.clientHeight;
    if (w / h < frame) w = h * frame;
    else h = w / frame;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    view = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
    home = view;
    changed();
  }

  function showView() {
    const { x0, y0, x1, y1 } = view;
    svg.setAttribute("viewBox", [x0, y0, x1 - x0, y1 - y0].join(" "));
    // Stripes look the same at any zoom: half stripe, half background
    const step = (x1 - x0) / STRIPES_PER_VIEW;
    for (const { pattern, background, line } of stripes) {
      for (const node of [pattern, background]) {
        node.setAttribute("width", step);
        node.setAttribute("height", step);
      }
      line.setAttribute("width", step / 2);
      line.setAttribute("height", step);
    }
  }

  return {
    // Sets the view on two routes [start, ..., target] (see framing.js): the small one
    // whole, the large one at least half way; rule 4: margin, smallest view, frame shape
    fitRoutes(small, large) {
      const boxes = [small, large]
        .filter((route) => route.every((code) => shapes[code]))
        .map((route) => routeBox(route, ringsOf));
      if (!boxes.length) return; // not on this map version: the whole map stays
      fitBox(twoRoutesBox(boxes[0], boxes.at(-1)), MARGIN, MIN_SIZE);
    },
    // Neighbors mode: the whole country with its surroundings
    fitCountry(code) {
      if (shapes[code]) fitBox(boxOf(ringsOf(code).flat()), COUNTRY_MARGIN, COUNTRY_MIN_SIZE);
    },

    // Countries blink twice (after a round: the shortest way)
    flash(codes) {
      for (const code of codes) {
        const path = shapes[code];
        if (!path) continue;
        path.classList.remove("flash");
        void path.getBBox(); // restart the animation
        path.classList.add("flash");
        path.addEventListener("animationend", () => path.classList.remove("flash"), { once: true });
      }
    },
    // Sets the look of a country: one of STATES or null (empty)
    setState(code, state) {
      if (state && !STATES.includes(state)) throw new Error(`Unknown map state: ${state}`);
      const path = shapes[code];
      if (!path) return;
      path.classList.remove(...STATES, "shown");
      path.querySelector("title")?.remove();
      if (state) {
        path.classList.add(state, "shown");
        const title = document.createElementNS(SVG_NS, "title");
        title.textContent = names[code] ?? code;
        path.append(title);
      }
    },
  };
}
