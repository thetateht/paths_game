// Rules of one round of the Neighbors mode (no drawing): naming all land neighbors of one
// country. The same interface as game.js (start = the country, onWay = is a neighbor),
// so the rest of the game works for both modes.
import { START_POINTS } from "./game.js";

export function createNeighborsGame(borders, country) {
  const neighbors = new Set(borders[country]);
  const found = new Set(); // all guessed countries
  let moves = 0;
  let points = START_POINTS;
  let won = false;
  let lost = false; // out of points or gave up

  return {
    start: country,
    neighbors: [...neighbors],
    freeMoves: neighbors.size,
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
    onWay: (code) => neighbors.has(code),

    // code: any country. Returns {result, delta}: result = "repeat" | "on" (a neighbor) |
    // "off", delta = change of the pool (each country that is not a neighbor: -1).
    guess(code) {
      if (code === country || found.has(code)) return { result: "repeat", delta: 0 };
      found.add(code);
      moves += 1;
      const on = neighbors.has(code);
      const before = points;
      if (!on) points = Math.max(0, points - 1);
      won = [...neighbors].every((c) => found.has(c));
      if (!won && points === 0) lost = true;
      return { result: on ? "on" : "off", delta: points - before };
    },
  };
}
