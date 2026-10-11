// Choosing the map view. Points are [x, y] in map units; boxes are {x0, y0, x1, y1}.
// Rules (see docs/plan.md):
// 1. A route is a chain of border crossings. The shortest line through them picks one
//    point on each crossed border; of the border counts the part within REACH of it.
// 2. Of the start and the target counts the part within END_REACH of their crossing point.
// 3. Two routes (shortest paths): the one with the smallest area whole, and towards the
//    one with the largest area at least half way.
// 4. Margin, smallest view and the frame's shape (in mapView.js).

export const REACH = 40; // map units, ~600 km
export const END_REACH = 70; // map units, ~1000 km

// Rings of an SVG path "M1,2L3,4Z M..." (only M, L, Z commands).
export function parseRings(d) {
  return d
    .split("M")
    .filter(Boolean)
    .map((part) => {
      const n = part.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const ring = [];
      for (let i = 0; i < n.length; i += 2) ring.push([n[i], n[i + 1]]);
      return ring;
    });
}

export function boxOf(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function union(a, b) {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const key = ([x, y]) => `${x},${y}`;

// Points of the common border of two countries (neighbors share outline points,
// as both come from the same map data). No common points (border too short
// for the map): the closest point of each country.
export function sharedBorder(ringsA, ringsB) {
  const a = ringsA.flat();
  const b = ringsB.flat();
  const inA = new Set(a.map(key));
  const shared = b.filter((p) => inA.has(key(p)));
  if (shared.length) return shared;
  let best = [a[0], b[0]];
  for (const p of a) {
    for (const q of b) if (distance(p, q) < distance(best[0], best[1])) best = [p, q];
  }
  return best;
}

// Rule 1: the crossings of a route [start, ..., target] (rings: code -> rings) as
// [{point, points}]: point = where the shortest line through the borders crosses this
// one, points = the border within REACH of it.
export function crossings(route, rings) {
  const borders = [];
  for (let i = 1; i < route.length; i++) {
    borders.push(sharedBorder(rings(route[i - 1]), rings(route[i])));
  }
  // Shortest line: for every point of a border, the length of the shortest line from
  // the first border to it, and the previous point on that line
  let length = borders[0].map(() => 0);
  const previous = [null];
  for (let i = 1; i < borders.length; i++) {
    const from = borders[i - 1];
    const back = [];
    length = borders[i].map((p) => {
      let best = 0;
      from.forEach((q, k) => {
        if (length[k] + distance(p, q) < length[best] + distance(p, from[best])) best = k;
      });
      back.push(best);
      return length[best] + distance(p, from[best]);
    });
    previous.push(back);
  }
  // The line's points, from the last border back to the first
  let j = length.indexOf(Math.min(...length));
  const result = [];
  for (let i = borders.length - 1; i >= 0; i--) {
    const point = borders[i][j];
    result.unshift({ point, points: borders[i].filter((p) => distance(p, point) <= REACH) });
    if (i > 0) j = previous[i][j];
  }
  return result;
}

// Rules 1 and 2: box of a route [start, ..., target]; rings: code -> rings.
export function routeBox(route, rings) {
  const cs = crossings(route, rings);
  // Part of an end country near its crossing point (at least that point)
  const endPart = (code, point) => [
    point,
    ...rings(code).flat().filter((p) => distance(p, point) <= END_REACH),
  ];
  return [
    ...cs.map((c) => boxOf(c.points)),
    boxOf(endPart(route[0], cs[0].point)),
    boxOf(endPart(route.at(-1), cs.at(-1).point)),
  ].reduce(union);
}

// Rule 3: the whole box of the smaller route, and towards the larger one half way
export function twoRoutesBox(small, large) {
  return {
    x0: Math.min(small.x0, (small.x0 + large.x0) / 2),
    y0: Math.min(small.y0, (small.y0 + large.y0) / 2),
    x1: Math.max(small.x1, (small.x1 + large.x1) / 2),
    y1: Math.max(small.y1, (small.y1 + large.y1) / 2),
  };
}
