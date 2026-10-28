// Game options: choices on the start screen and levels.

// Game types on the start screen (names and descriptions in texts.js)
export const MODES = {
  paths: {},
  neighbors: {},
};
// Switches of the game mode: two states each (the easier one first, on the left;
// names in texts.js: toggle_<state>)
export const TOGGLES = {
  input: ["buttons", "typing"],
  time: ["untimed", "timed"],
  map: ["map", "blank"],
};

// Routes, weights of drawing a pair (see pairWeight, busyWeight in graph.js):
// neighbors = well connected start and target more often (off: it comes by itself),
// continents = by CONTINENT_FACTORS, busy = ways through busy countries less often
export const PAIR_WEIGHTS = { neighbors: false, continents: true, busy: true };
// Factor of each end by its continent (continent in countries.json): mostly Europe on easy
// levels, Africa comes more on harder ones (few long ways in Europe)
export const CONTINENT_FACTORS = { europe: 1, asia: 0.8, africa: 0.6 };
// Busyness above which a way is less likely, per level (longer ways: the last one)
export const BUSY_THRESHOLDS = [0.11, 0.16, 0.2, 0.23];
// Countries of the last rounds' ways (start, target, all shortest ways), the last round
// first: pairs with a shortest way through them get weight × factor (0 = not drawn)
export const RECENT_WAY_FACTORS = [0, 0.33];

export const TIME_LIMIT = 30; // seconds per round in timed mode

// Levels: countries between start and target (level 1 = 2 countries)
export const LEVELS = [2, 3, 4, 5];
// Routes, playing on after a win: countries between start and target to choose from
export const BONUS_LENGTHS = [5, 6, 7];

// Country buttons per level (instead of typing) and their columns; longer ways: last
// (Neighbors mode: 2 columns)
export const BUTTONS = [12, 14, 18, 21];
export const BUTTON_COLUMNS = [2, 2, 3, 3];

// Neighbors mode: neighbors of the country per level [min, max] (no countries with one
// neighbor, no China and Russia with 14), buttons per level, score to win, rounds before
// the same country can come again
export const NEIGHBOR_LEVELS = [
  [2, 3],
  [4, 5],
  [6, 9],
];
export const NEIGHBOR_BUTTONS = [12, 12, 14];
export const NEIGHBOR_WIN_SCORE = 40;
export const NEIGHBOR_TIME_LIMITS = [20, 30, 40]; // timed mode: seconds per round, per level
export const NEIGHBOR_REPEAT_GAP = 10;
// Neighbors mode: countries that are not drawn as the country to guess (only named)
export const NEIGHBOR_NOT_DRAWN = ["ps"];
