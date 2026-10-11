// Rules of one round (no drawing): naming the countries on a shortest way from start
// to target, in any order. The round gives START_POINTS minus one for every country
// beyond the shortest way's count; the pool shows the most points still possible.
import { distancesFrom } from "./graph.js";

export const START_POINTS = 3; // pool of a round

// Fewest countries still missing to link start and target, guessed countries free
// (0-1 breadth-first search; may also be a longer way through guessed countries)
function fewestMissing(borders, start, target, found) {
  const cost = (c) => (c === target || found.has(c) ? 0 : 1);
  const best = { [start]: 0 };
  const queue = [start];
  while (queue.length) {
    const code = queue.shift();
    for (const next of borders[code]) {
      const d = best[code] + cost(next);
      if (best[next] === undefined || d < best[next]) {
        best[next] = d;
        if (cost(next) === 0) queue.unshift(next);
        else queue.push(next);
      }
    }
  }
  return best[target];
}

export function createGame(borders, start, target) {
  const fromStart = distancesFrom(borders, start);
  const toTarget = distancesFrom(borders, target);
  const length = fromStart[target]; // border crossings on a shortest way
  const freeMoves = length - 1; // countries between start and target
  const found = new Set(); // all guessed countries
  let moves = 0;
  let points = START_POINTS;
  let won = false;
  let lost = false; // out of points or gave up

  // On some shortest way from start to target (ends excluded)
  const onWay = (code) =>
    Boolean(borders[code]) && code !== start && code !== target &&
    fromStart[code] + toTarget[code] === length;

  return {
    start,
    target,
    freeMoves,
    get moves() {
      return moves;
    },
    get points() {
      return points;
    },
    get won() {
      return won;
    },
    get lost() {
      return lost;
    },
    get over() {
      return won || lost;
    },
    // Gave up or out of time
    giveUp() {
      if (!won) lost = true;
    },
    onWay,

    // code: any country (also one not in the game or outside the region).
    // Returns {result, delta}: result = "repeat" | "on" (on a shortest way) | "off",
    // delta = change of the pool (0 or negative).
    guess(code) {
      if (code === start || code === target || found.has(code)) {
        return { result: "repeat", delta: 0 };
      }
      found.add(code);
      moves += 1;
      const missing = fewestMissing(borders, start, target, found);
      // Best possible result: the countries typed so far plus the missing ones
      const before = points;
      points = Math.max(0, START_POINTS - (moves + missing - freeMoves));
      won = missing === 0; // the guessed countries link start and target
      if (!won && points === 0) lost = true; // no point can be won any more
      return { result: onWay(code) ? "on" : "off", delta: points - before };
    },
  };
}
