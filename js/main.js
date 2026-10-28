// Entry point: loads data, runs games.
import { loadData } from "./data.js";
import { loadMapFor, createMap } from "./mapView.js";
import {
  randomPair,
  pairWeight,
  busyWeight,
  bestShortestPath,
  extremeShortestPaths,
  buttonCountries,
  neighborButtons,
  randomCountry,
} from "./graph.js";
import { createGame } from "./game.js";
import { createNeighborsGame } from "./neighborsGame.js";
import { createNameIndex } from "./names.js";
import { createStartScreen } from "./startScreen.js";
import { initialLang, setLang, currentLang, applyTexts, t } from "./texts.js";
import {
  MODES,
  TOGGLES,
  LEVELS,
  BUTTONS,
  BUTTON_COLUMNS,
  PAIR_WEIGHTS,
  CONTINENT_FACTORS,
  BUSY_THRESHOLDS,
  RECENT_WAY_FACTORS,
  TIME_LIMIT,
  NEIGHBOR_LEVELS,
  NEIGHBOR_BUTTONS,
  NEIGHBOR_WIN_SCORE,
  NEIGHBOR_REPEAT_GAP,
  NEIGHBOR_NOT_DRAWN,
  NEIGHBOR_TIME_LIMITS,
  BONUS_LENGTHS,
} from "./options.js";
import { startTimer } from "./roundTimer.js";
import { createSession, LIVES, WIN_SCORE } from "./session.js";
import { setupScaling } from "./scaling.js";

const MAX_SUGGESTIONS = 8;
// Start screen choices: game type and the switches of the game mode (see TOGGLES)
const choice = { mode: "paths", input: "typing", time: "untimed", map: "map" };

setupScaling();
setLang(initialLang());
applyTexts(); // page texts before the data loads

const { countries, borders: routeBorders, neighbors: neighborBorders, areas, centroids } =
  await loadData();
// Routes: pair weight factor of each country (see pairWeight)
const continentFactors = {};
for (const [code, country] of Object.entries(countries)) {
  if (country.continent) continentFactors[code] = CONTINENT_FACTORS[country.continent];
}
// Routes: pair weights per number of countries between, made when first needed
const routeWeights = {};
function routeWeight(between) {
  if (!routeWeights[between]) {
    const base = pairWeight(routeBorders, {
      neighbors: PAIR_WEIGHTS.neighbors,
      factors: PAIR_WEIGHTS.continents ? continentFactors : {},
    });
    const level = LEVELS.indexOf(between);
    const threshold = BUSY_THRESHOLDS[level >= 0 ? level : BUSY_THRESHOLDS.length - 1];
    routeWeights[between] = PAIR_WEIGHTS.busy
      ? busyWeight(routeBorders, between, base, threshold)
      : base;
  }
  return routeWeights[between];
}
let names; // {code: name} in the current language
let nameIndex; // typed names in the current language
function useLang() {
  names = {};
  for (const [code, country] of Object.entries(countries)) names[code] = country.name[currentLang()];
  nameIndex = createNameIndex(countries, currentLang());
}
useLang();

const el = (id) => document.getElementById(id);
const form = el("guess-form");
const input = el("guess-input");
const list = el("suggestions");

let playable; // countries in the game (others are grayed on the map)
let borders; // their neighbors (Routes or Neighbors data)
let session; // series of rounds: score, lives, level
let game; // current round
let neighborsMode = false; // the game type of this game: Neighbors (else Routes)
let recentWays = []; // Routes: start, target and shortest ways of the last rounds, last first
let recent = []; // Neighbors: the countries of the last rounds
let timer = null; // countdown of the round (timed mode)
let map;
let found; // guessed countries, in order
let otherWays = []; // after a round: countries of the shortest ways not shown yet
let roundId = 0; // a round whose map is still loading is dropped when this changes
let bonusLength = BONUS_LENGTHS[0]; // Routes, playing on after a win: countries between

// New game: a new series of rounds with the chosen options
function newGame() {
  neighborsMode = choice.mode === "neighbors";
  // Neighbors mode: also small countries (Luxembourg, Andorra, Palestine...)
  borders = neighborsMode ? neighborBorders : routeBorders;
  playable = new Set(Object.keys(borders));
  el("game-title").textContent = t("game_title", t(`mode_${choice.mode}`));
  session = neighborsMode
    ? createSession(NEIGHBOR_LEVELS.length, NEIGHBOR_WIN_SCORE)
    : createSession(LEVELS.length, WIN_SCORE);
  recentWays = [];
  recent = [];
  bonusLength = BONUS_LENGTHS[0];
  el("game-end").hidden = true;
  el("free-play").hidden = true;
  newRound();
}

async function newRound() {
  el("next-round").hidden = true; // at once: no second round while the map loads
  el("show-ways").hidden = true;
  el("ways-count").hidden = true;
  let start, target;
  if (neighborsMode) {
    start = randomCountry(borders, NEIGHBOR_LEVELS[session.level], [...recent, ...NEIGHBOR_NOT_DRAWN]);
    game = createNeighborsGame(borders, start);
    recent = [start, ...recent].slice(0, NEIGHBOR_REPEAT_GAP); // not again for a while
  } else {
    // After a win (playing on): the chosen length
    const between = session.free ? bonusLength : LEVELS[session.level];
    const recent = recentWays.map((countries, i) => ({ countries, factor: RECENT_WAY_FACTORS[i] }));
    [start, target] = randomPair(borders, [between, between], routeWeight(between), recent);
    game = createGame(borders, start, target);
    // Countries of this round's shortest ways: less likely in the next rounds
    const way = new Set([start, target, ...Object.keys(borders).filter(game.onWay)]);
    recentWays = [way, ...recentWays].slice(0, RECENT_WAY_FACTORS.length);
  }
  found = [];

  const id = ++roundId;
  const mapData = await loadMapFor(neighborsMode ? [start] : [start, target]);
  if (id !== roundId) return; // the game was ended while the map was loading
  showScreen("game"); // before drawing: the map needs its size on the page
  el("map-area").replaceChildren();
  map = createMap(el("map-area"), mapData, names, playable, choice.map === "blank");
  if (neighborsMode) {
    map.fitCountry(start);
  } else {
    const routes = extremeShortestPaths(borders, start, target, (c) => areas[c]);
    map.fitRoutes(routes.min, routes.max);
    map.setState(target, "target");
  }
  map.setState(start, "start");

  el("task").replaceChildren(
    ...(neighborsMode
      ? [label(names[start], "start")]
      : [label(names[start], "start"), " → ", label(names[target], "target")])
  );
  fitTask();
  el("message").textContent = "";
  el("log").replaceChildren();
  showStatus();
  input.disabled = false;
  el("input-area").hidden = false;
  el("message").classList.remove("event");
  el("give-up").hidden = choice.input === "buttons"; // with buttons: just click any
  el("next-round").hidden = true;
  input.value = "";
  hideSuggestions();
  showInput();
  startRoundTimer();
}

// Timed mode: countdown of the round; out of time = round lost
function startRoundTimer() {
  timer?.stop();
  timer = null;
  const timed = choice.time === "timed" && !session.free; // playing on after a win: no time
  el("timer").hidden = !timed;
  el("timer").classList.remove("out");
  if (!timed) return;
  timer = startTimer(
    neighborsMode ? NEIGHBOR_TIME_LIMITS[session.level] : TIME_LIMIT,
    (left) => {
      el("time").textContent = left;
      el("time").classList.toggle("ending", left <= 5);
    },
    () => {
      el("timer").classList.add("out");
      game.giveUp();
      finish(t("time_out"));
      showStatus();
      input.blur();
    }
  );
}

// Start → target in one line: smaller font when it does not fit, wraps only at the smallest
const TASK_FONT = { max: 18, min: 12 }; // pt
function fitTask() {
  const task = el("task");
  task.style.whiteSpace = "nowrap";
  let size = TASK_FONT.max;
  task.style.fontSize = `${size}pt`;
  while (task.scrollWidth > task.clientWidth && size > TASK_FONT.min) {
    size -= 1;
    task.style.fontSize = `${size}pt`;
  }
  if (task.scrollWidth > task.clientWidth) task.style.whiteSpace = "normal";
}

// Typing or (buttons mode) countries to click: the shortest paths' countries and the
// ones on slightly longer ways (see buttonCountries), in alphabetical order
function showInput() {
  const buttons = choice.input === "buttons";
  el("guess-form").hidden = buttons;
  el("country-buttons").hidden = !buttons;
  // With buttons the history shows after the round (the buttons' colors show it before)
  el("log").hidden = buttons;
  if (!buttons) {
    input.focus();
    return;
  }
  let codes;
  if (neighborsMode) {
    const here = centroids[game.start];
    const distance = (code) => distanceFromLine(centroids[code], [here, here]);
    codes = neighborButtons(borders, game.start, NEIGHBOR_BUTTONS[session.level], distance);
  } else {
    const line = [centroids[game.start], centroids[game.target]];
    const distance = (code) => distanceFromLine(centroids[code], line);
    codes = buttonCountries(borders, game.start, game.target, BUTTONS[session.level], distance);
  }
  codes.sort((a, b) => names[a].localeCompare(names[b], currentLang()));
  const list = el("country-buttons");
  const columns = neighborsMode ? 2 : BUTTON_COLUMNS[session.level];
  list.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  list.classList.toggle("wide", columns === 3);
  list.replaceChildren(
    ...codes.map((code) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn country-button";
      button.dataset.code = code;
      button.textContent = names[code];
      button.addEventListener("click", () => play(code));
      return button;
    })
  );
}

// Distance (degrees, roughly) of a point [lon, lat] from the line between two points
// (or from one point, if both are the same), on a flat map with longitudes shortened as
// at the line's latitude
function distanceFromLine([lon, lat], [[lon1, lat1], [lon2, lat2]]) {
  const k = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const [px, py, ax, ay, bx, by] = [lon * k, lat, lon1 * k, lat1, lon2 * k, lat2];
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Shows one screen: "start" or "game"
function showScreen(name) {
  el("start").hidden = name !== "start";
  el("game").hidden = name !== "game";
}

// <span class="..."> with text
function label(text, className) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

// Status card (level, score, lives) and the round's pool
function showStatus() {
  el("status").hidden = session.free; // playing on after a win: no points, no lives
  el("level").textContent = session.level + 1;
  el("score").textContent = session.score;
  el("lives").textContent = "♥".repeat(session.lives) + "♡".repeat(LIVES - session.lives);
  // Routes, between rounds after a win: the length of the next routes to choose
  if (!neighborsMode && game.over && (session.winner || session.free)) {
    const select = document.createElement("select");
    select.className = "bonus-length";
    select.append(...BONUS_LENGTHS.map((n) => new Option(t("bonus_option", n), n)));
    select.value = bonusLength;
    select.addEventListener("change", () => (bonusLength = Number(select.value)));
    el("optimal").replaceChildren(t("bonus_length"), " ", select);
  } else {
    el("optimal").textContent = t(neighborsMode ? "neighbor_count" : "optimal_path", game.freeMoves);
  }
  // During the round: pool (blinks when it drops); after it: points the round gave
  const pool = el("pool");
  if (session.free) {
    pool.replaceChildren(t("free_mode"));
    pool.classList.remove("won", "lost");
    return;
  }
  const value = label(game.over && !game.won ? 0 : game.points, "pool-value");
  const dropped = !game.over && Number(pool.dataset.points) > game.points;
  pool.replaceChildren(t(game.over ? "round_result" : "round_pool"), " ", value);
  pool.dataset.points = game.points;
  if (dropped) value.classList.add("dropped");
  pool.classList.toggle("won", game.won);
  pool.classList.toggle("lost", game.over && !game.won);
}

// New entry on top of the history: the country's name in its map color
// (state = "on-way" / "off-way"); the newest is bold (see CSS), numbered by moves
function addLog(code, state) {
  const item = document.createElement("li");
  item.dataset.code = code;
  item.append(label(names[code], state));
  item.value = el("log").children.length + 1;
  el("log").prepend(item);
}

// Plays one recognized country
function play(code) {
  input.value = "";
  hideSuggestions();
  el("message").textContent = "";
  if (game.over) return;

  const outcome = game.guess(code);
  if (outcome.result === "repeat") {
    // Not a move: shown under the input, not in the history
    el("message").textContent = t("repeat", names[code]);
    return;
  }
  found.push(code);
  // Dark green = on a shortest way, olive = off it (also grayed countries not in the game)
  const state = outcome.result === "on" ? "on-way" : "off-way";
  map.setState(code, state);
  const button = el("country-buttons").querySelector(`[data-code="${code}"]`);
  if (button) {
    button.classList.add(state);
    button.disabled = true;
  }
  addLog(code, state);

  if (game.over) finish();
  showStatus();
}

// Ends the round: shows the ways on the map, counts it in the session,
// notes what it changed in the game (level up, life lost, end)
// first = sentence to start the note with (out of time)
function finish(first = "") {
  timer?.stop();
  input.disabled = true;
  hideSuggestions();
  el("input-area").hidden = true; // the round result takes its place
  el("log").hidden = false; // buttons mode: the history of the round now
  el("give-up").hidden = true;
  const shown = showWays();
  map.flash(shown); // the shortest way blinks twice
  // Routes: countries of other shortest ways, not on the map yet: shown on request
  otherWays = neighborsMode
    ? []
    : Object.keys(borders).filter((c) => game.onWay(c) && !found.includes(c) && !shown.includes(c));
  el("show-ways").hidden = !otherWays.length;
  if (otherWays.length) {
    const { count } = bestShortestPath(borders, game.start, game.target, new Set(found));
    el("show-ways").textContent = t("show_ways", count);
    el("ways-count").textContent = t("ways_count", count);
  }

  let note;
  if (game.won) {
    const levelUp = session.won(game.points);
    if (levelUp && !session.over) note = t("level_up");
  } else {
    session.lost();
    if (!session.over && !session.free) note = t("life_lost", session.lives);
  }
  el("message").textContent = [first, note].filter(Boolean).join(" ");
  el("message").classList.add("event"); // level up, life lost: well visible
  // After a win: "Play on without points" in the place of Next, to the end of the game
  el("next-round").hidden = session.over || session.free;
  el("free-play").hidden = !session.free;
  if (session.over) showGameEnd();
}

// End of the whole game: big note at the top; after a win, playing on without points
function showGameEnd() {
  const end = el("game-end");
  end.hidden = false;
  end.classList.toggle("won", session.winner);
  end.classList.toggle("lost", !session.winner);
  el("game-end-text").textContent = t(session.winner ? "game_won" : "game_over");
  el("free-play").hidden = !session.winner;
}

// After the round (Neighbors: the missing neighbors striped, all neighbors blink).
// Routes: best shortest ways = those with most guessed countries (all of them
// count, not just one): missing countries of one such way striped green; guessed
// countries of other, worse shortest ways (not needed) striped green-olive. History notes
// where the color alone does not say it: a worse shortest way, or (when the best ways are
// complete, i.e. found) one of several complete shortest ways found. Returns the countries of the best ways.
function showWays() {
  if (neighborsMode) {
    // Neighbors: the missing ones striped; all neighbors blink
    for (const c of game.neighbors) if (!found.includes(c)) map.setState(c, "missed");
    return game.neighbors;
  }
  const { path, bestCount, bestPaths } = bestShortestPath(
    borders, game.start, game.target, new Set(found)
  );
  for (const c of path.slice(1, -1)) if (!found.includes(c)) map.setState(c, "missed");
  // The best ways are found only when complete (not after a win by a longer route)
  const complete = path.slice(1, -1).every((c) => found.includes(c));
  const blink = new Set(path.slice(1, -1)); // the shown way and guessed ones on best ways
  for (const c of found) {
    if (!game.onWay(c)) continue;
    const item = el("log").querySelector(`[data-code="${c}"]`);
    if (bestPaths[c]) blink.add(c);
    if (!bestPaths[c]) {
      map.setState(c, "unneeded");
      item.firstChild.className = "unneeded";
      item.append(label(t("other_way"), "log-note"));
    } else if (complete && bestPaths[c] < bestCount) {
      item.append(label(t("one_of_ways", bestCount), "log-note"));
    }
  }
  return [...blink];
}

// ---------- Suggestions under the input ----------
let suggestions = []; // codes
let selected = -1; // index in suggestions, -1 = none

function showSuggestions() {
  suggestions = nameIndex.suggest(input.value, MAX_SUGGESTIONS);
  selected = -1;
  renderSuggestions();
}

function hideSuggestions() {
  suggestions = [];
  renderSuggestions();
}

function renderSuggestions() {
  list.replaceChildren(
    ...suggestions.map((code, i) => {
      const item = document.createElement("li");
      item.textContent = names[code];
      if (i === selected) item.classList.add("selected");
      // mousedown, not click: runs before the input loses focus
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        play(code);
      });
      return item;
    })
  );
  list.hidden = suggestions.length === 0;
}

input.addEventListener("input", () => {
  el("message").textContent = ""; // a note about the earlier text is no longer true
  showSuggestions();
});
input.addEventListener("blur", hideSuggestions);
input.addEventListener("keydown", (event) => {
  if (!suggestions.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    selected = (selected + step + suggestions.length + 1) % (suggestions.length + 1);
    if (selected === suggestions.length) selected = -1; // back to the typed text
    renderSuggestions();
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault(); // no page reload
  if (selected >= 0) return play(suggestions[selected]);

  const text = input.value.trim();
  if (!text) return;
  const codes = nameIndex.match(text);
  if (codes.length === 1) {
    play(codes[0]);
  } else if (!codes.length && suggestions.length === 1) {
    play(suggestions[0]); // the only country starting like this
  } else if (!codes.length && !suggestions.length) {
    el("message").textContent = t("unknown", text);
  }
  // more countries fit (e.g. "Kongo", "Ko"): the suggestions list stays to choose from
});

el("end-game").addEventListener("click", () => {
  roundId += 1; // a round still loading is not shown
  timer?.stop();
  showScreen("start");
});
el("give-up").addEventListener("click", () => {
  game.giveUp();
  finish();
  showStatus();
  input.blur();
});
el("next-round").addEventListener("click", newRound);
el("show-ways").addEventListener("click", () => {
  for (const c of otherWays) map.setState(c, "missed");
  map.flash(otherWays);
  el("show-ways").hidden = true;
  el("ways-count").hidden = false;
});
el("free-play").addEventListener("click", () => {
  session.playFree();
  el("free-play").hidden = true;
  newRound();
});
// Space or Enter after a round = Next (or Play on without points)
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (el("game").hidden || event.repeat) return;
  const next = [el("next-round"), el("free-play")].find((b) => !b.hidden);
  if (!next || event.target.tagName === "SELECT") return;
  event.preventDefault(); // no click of a focused button as well
  next.click();
});

createStartScreen({
  options: { mode: MODES },
  toggles: TOGGLES,
  choice,
  onPlay: newGame,
  onLang: useLang,
});
