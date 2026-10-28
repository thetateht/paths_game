// Country graph: borders = {code: [neighbor codes]}.

// Number of border crossings from `from` to every reachable country: {code: distance}.
// allowed (optional Set): move only through these countries.
export function distancesFrom(borders, from, allowed = null) {
  const dist = { [from]: 0 };
  const queue = [from];
  while (queue.length) {
    const code = queue.shift();
    for (const next of borders[code]) {
      if (dist[next] === undefined && (!allowed || allowed.has(next))) {
        dist[next] = dist[code] + 1;
        queue.push(next);
      }
    }
  }
  return dist;
}

// All [start, target] with exactly `between` countries between them on the shortest path.
// avoid (Set): pairs with a shortest path going through such a country (ends included)
// are left out.
export function candidatePairs(borders, between, avoid = new Set()) {
  const pairs = [];
  for (const start of Object.keys(borders)) {
    if (avoid.has(start)) continue;
    // Breadth-first layers
    const dist = { [start]: 0 };
    const viaAvoided = {}; // some shortest path from start goes through an avoided country
    let layer = [start];
    for (let d = 1; d <= between + 1 && layer.length; d++) {
      const next = [];
      for (const code of layer) {
        for (const n of borders[code]) {
          if (dist[n] === undefined) {
            dist[n] = d;
            next.push(n);
          }
          if (dist[n] === d && (viaAvoided[code] || avoid.has(n))) viaAvoided[n] = true;
        }
      }
      layer = next;
    }
    for (const target of layer) if (!viaAvoided[target]) pairs.push([start, target]);
  }
  return pairs;
}

// Weight of a pair for randomPair: (start, target) => number.
// neighbors: × neighbors of start × neighbors of target (well connected countries more often);
// factors = {code: number} (missing = 1): × factor of start × factor of target.
export function pairWeight(borders, { neighbors = false, factors = {} } = {}) {
  const factor = (code) => factors[code] ?? 1;
  const links = (code) => (neighbors ? borders[code].length : 1);
  return (start, target) => links(start) * links(target) * factor(start) * factor(target);
}

// Weight of the pairs with `between` countries between them (see candidatePairs): the base
// weight (start, target) => number, lowered for ways through busy countries. Busyness of a
// country = its share of the base weight of these pairs, as a country between on a shortest
// way. Busyness of a pair = that of the busiest country on its least busy shortest way;
// above `threshold` the weight is × threshold / busyness. Returns (start, target) => number.
export function busyWeight(borders, between, base, threshold) {
  const codes = Object.keys(borders);
  const dist = Object.fromEntries(codes.map((code) => [code, distancesFrom(borders, code)]));
  const pairs = candidatePairs(borders, between).map(([start, target]) => {
    // Countries between on a shortest way, nearest to start first
    const way = codes
      .filter((c) => c !== start && c !== target && dist[start][c] + dist[c][target] === between + 1)
      .sort((a, b) => dist[start][a] - dist[start][b]);
    return { start, target, way, weight: base(start, target) };
  });
  const total = pairs.reduce((sum, p) => sum + p.weight, 0);
  const busy = {};
  for (const p of pairs) for (const c of p.way) busy[c] = (busy[c] ?? 0) + p.weight / total;

  const weights = {};
  for (const { start, target, way, weight } of pairs) {
    // least[c] = busyness of the least busy way from start to c (its busiest country)
    const least = { [start]: 0 };
    const fromPrevious = (code, d) =>
      Math.min(...borders[code].filter((n) => n in least && dist[start][n] === d).map((n) => least[n]));
    for (const c of way) least[c] = Math.max(busy[c], fromPrevious(c, dist[start][c] - 1));
    const busyness = fromPrevious(target, between);
    weights[`${start}-${target}`] = busyness > threshold ? (weight * threshold) / busyness : weight;
  }
  return (start, target) => weights[`${start}-${target}`];
}

// Random [start, target] with min to max countries between them, drawn by weight
// (see candidatePairs, pairWeight, busyWeight).
// recent = [{countries: Set, factor}]: pairs with a shortest path through such countries
// (ends included) get weight × factor; factor 0 = left out (if this leaves no pair, not).
export function randomPair(borders, [min, max], weight = () => 1, recent = [], random = Math.random) {
  const collect = (avoid) => {
    const pairs = [];
    for (let between = min; between <= max; between++) {
      pairs.push(...candidatePairs(borders, between, avoid));
    }
    return pairs;
  };
  const blocked = new Set(recent.filter((r) => r.factor === 0).flatMap((r) => [...r.countries]));
  let pairs = collect(blocked);
  if (!pairs.length) pairs = collect(new Set());
  const weights = pairs.map(([start, target]) => weight(start, target));
  for (const { countries, factor } of recent) {
    if (factor === 0) continue;
    const clear = new Set(collect(countries).map(([start, target]) => `${start}-${target}`));
    pairs.forEach(([start, target], i) => {
      if (!clear.has(`${start}-${target}`)) weights[i] *= factor;
    });
  }
  let r = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < pairs.length; i++) {
    r -= weights[i];
    if (r < 0) return pairs[i];
  }
  return pairs[pairs.length - 1]; // guard against rounding errors
}

// One shortest path from `from` to `to`, both included: [from, ..., to].
// allowed (optional Set, must contain both ends): move only through these countries.
export function shortestPath(borders, from, to, allowed = null) {
  const dist = distancesFrom(borders, to, allowed);
  const path = [from];
  let code = from;
  while (code !== to) {
    code = borders[code].find((next) => dist[next] === dist[code] - 1);
    path.push(code);
  }
  return path;
}

// Shortest path from `from` to `to` going through as many `preferred` countries as possible.
// Returns {path: [from, ..., to], count: number of all shortest paths,
// bestCount: number of best paths (with the most preferred countries),
// bestPaths: {country: number of best paths through it} (only countries on some; ends too)}.
export function bestShortestPath(borders, from, to, preferred) {
  const dist = distancesFrom(borders, to);
  const score = {}; // most preferred countries on a shortest path from code to `to`
  const count = {}; // number of shortest paths from code to `to`
  const nextSteps = (code) => borders[code].filter((next) => dist[next] === dist[code] - 1);
  function solve(code) {
    if (score[code] !== undefined) return;
    let best = 0;
    let paths = code === to ? 1 : 0;
    for (const next of nextSteps(code)) {
      solve(next);
      best = Math.max(best, score[next]);
      paths += count[next];
    }
    score[code] = best + (preferred.has(code) ? 1 : 0);
    count[code] = paths;
  }
  solve(from);

  const path = [from];
  let code = from;
  while (code !== to) {
    const steps = nextSteps(code);
    code = steps.reduce((a, b) => (score[b] > score[a] ? b : a));
    path.push(code);
  }
  // Best paths = shortest paths with the most preferred countries (score[from] of them).
  // A country is on a best path when the best part up to it (from the `from` side)
  // plus the best part after it gives score[from]; counting such parts on both sides
  // tells on how many best paths it lies.
  const own = (c) => (preferred.has(c) ? 1 : 0);
  const bestTo = {}; // number of best parts from code to `to`
  const countTo = (c) => {
    if (bestTo[c] === undefined) {
      bestTo[c] = c === to ? 1 : 0;
      for (const n of nextSteps(c)) if (score[n] === score[c] - own(c)) bestTo[c] += countTo(n);
    }
    return bestTo[c];
  };
  const fromStart = distancesFrom(borders, from);
  const order = Object.keys(fromStart)
    .filter((c) => fromStart[c] + dist[c] === dist[from])
    .sort((a, b) => fromStart[a] - fromStart[b]);
  const scoreFrom = {}; // most preferred countries on a shortest path from `from` to code
  const bestFrom = {}; // number of such best parts
  const bestPaths = {}; // country -> number of best paths through it
  for (const c of order) {
    const before = borders[c].filter((p) => p in scoreFrom && fromStart[p] === fromStart[c] - 1);
    const prev = before.length ? Math.max(...before.map((p) => scoreFrom[p])) : 0;
    scoreFrom[c] = prev + own(c);
    bestFrom[c] = before.length
      ? before.filter((p) => scoreFrom[p] === prev).reduce((sum, p) => sum + bestFrom[p], 0)
      : 1;
    if (scoreFrom[c] + score[c] - own(c) === score[from]) bestPaths[c] = bestFrom[c] * countTo(c);
  }
  return { path, count: count[from], bestCount: countTo(from), bestPaths };
}

// The shortest paths from `from` to `to` with the smallest and the largest sum of
// weight(country) over the countries between: {min: [from, ..., to], max: [...]}.
export function extremeShortestPaths(borders, from, to, weight) {
  const dist = distancesFrom(borders, to);
  const nextSteps = (code) => borders[code].filter((next) => dist[next] === dist[code] - 1);
  const memo = {}; // code -> {min: [sum, path], max: [sum, path]} from code to `to`
  function solve(code) {
    if (memo[code]) return memo[code];
    if (code === to) return (memo[code] = { min: [0, [to]], max: [0, [to]] });
    const own = code === from ? 0 : weight(code);
    const options = nextSteps(code).map(solve);
    const pick = (key, better) => {
      const [sum, path] = options.map((o) => o[key]).reduce((a, b) => (better(b[0], a[0]) ? b : a));
      return [sum + own, [code, ...path]];
    };
    return (memo[code] = { min: pick("min", (x, y) => x < y), max: pick("max", (x, y) => x > y) });
  }
  const { min, max } = solve(from);
  return { min: min[1], max: max[1] };
}

// Countries for the buttons (instead of typing): the countries ordered by detour = how
// many countries longer the shortest way through them is (0 = on a shortest path; ways
// may not pass the start or the target on the way), ties by distance(code) (geography).
// Start and target are not included.
export function buttonCountries(borders, start, target, count, distance) {
  const all = Object.keys(borders);
  const without = (code) => new Set(all.filter((c) => c !== code));
  const fromStart = distancesFrom(borders, start, without(target));
  const toTarget = distancesFrom(borders, target, without(start));
  const length = distancesFrom(borders, start)[target];
  const detour = (c) => fromStart[c] + toTarget[c] - length;
  return all
    .filter((c) => c !== start && c !== target && fromStart[c] !== undefined && toTarget[c] !== undefined)
    .sort((a, b) => detour(a) - detour(b) || distance(a) - distance(b))
    .slice(0, count);
}

// Neighbors mode buttons: all neighbors of the country, then other countries by the number
// of borders from it, ties by distance(code) (geography). The country itself not included.
export function neighborButtons(borders, country, count, distance) {
  const steps = distancesFrom(borders, country);
  return Object.keys(steps)
    .filter((c) => c !== country)
    .sort((a, b) => steps[a] - steps[b] || distance(a) - distance(b))
    .slice(0, Math.max(count, borders[country].length));
}

// Random country with [min, max] neighbors, not one of `avoid` (if none is left, any).
export function randomCountry(borders, [min, max], avoid = [], random = Math.random) {
  const fits = (c) => borders[c].length >= min && borders[c].length <= max;
  let choices = Object.keys(borders).filter((c) => fits(c) && !avoid.includes(c));
  if (!choices.length) choices = Object.keys(borders).filter(fits);
  return choices[Math.floor(random() * choices.length)];
}
