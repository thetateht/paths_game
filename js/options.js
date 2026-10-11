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

// Borders no shortest way of a drawn pair may cross: the China–Russia border is a short
// stretch in the Altai, but it would make a shortcut between Asia and Eastern Europe
export const AVOID_BORDERS = [["cn", "ru"]];

export const TIME_LIMIT = 30; // seconds per round in timed mode

// Levels: countries between start and target (level 1 = 2 countries)
export const LEVELS = [2, 3, 4, 5];
// Routes, playing on after a win: countries between start and target to choose from
export const BONUS_LENGTHS = [5, 6, 7];

// Country buttons per level (instead of typing), in 2 columns
export const BUTTONS = [12, 12, 14, 14];
export const BUTTON_COLUMNS = 2;

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
