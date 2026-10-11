// Texts of the game in all languages. t(key, ...args) gives a text in the current language;
// texts with numbers or names are functions.

export const LANGUAGES = ["pl", "en"];
const STORAGE_KEY = "paths-lang";

let lang = "pl";

export const currentLang = () => lang;

// Saved choice, otherwise the browser language (Polish or English)
export function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language.startsWith("pl") ? "pl" : "en";
}

export function setLang(newLang) {
  lang = newLang;
  try {
    localStorage.setItem(STORAGE_KEY, newLang);
  } catch {
    // not saved, works until the page is reloaded
  }
}

// Polish plural: 1 kraj, 2–4 kraje, 5–21 krajów, 22–24 kraje...
export function plural(n, one, few, many) {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

export const TEXTS = {
  // ---------- Page and start screen ----------
  title: { pl: "Granice", en: "Borders" },
  // Game screen: the game name and the game type
  game_title: { pl: (mode) => `Granice – ${mode}`, en: (mode) => `Borders – ${mode}` },
  rules_head: {
    pl: "Znajdź trasę pomiędzy dwoma krajami.",
    en: "Find the route between two countries.",
  },
  // {field=state|words}: words highlighted when the game mode switch is on that state
  rules_intro: {
    pl: "Na mapie ({map=map|zwykłej} lub {map=blank|pustej}) zaznaczone będą dwa kraje. Podaj ({input=typing|wpisz} lub {input=buttons|kliknij}) nazwy krajów, przez które da się dotrzeć od jednego do drugiego. Liczą się tylko granice lądowe. Gra obejmuje kraje Europy, Azji i Afryki.",
    en: "Two countries will be marked on the map ({map=map|a full one} or {map=blank|a blank one}). Name ({input=typing|type} or {input=buttons|click}) the countries you can pass through to get from one to the other. Only land borders count. The game covers the countries of Europe, Asia and Africa.",
  },
  rules_timed: {
    pl: "Możesz grać {time=untimed|bez ograniczenia czasu} lub {time=timed|z limitem 30 sekund na rundę}.",
    en: "You can play {time=untimed|with no time restriction} or {time=timed|with a limit of 30 seconds per round}.",
  },
  rules_scoring_intro: {
    pl: "Jeśli znajdziesz najmniejszą możliwą liczbę krajów, dostaniesz 3 punkty. Każdy kraj więcej kosztuje 1 punkt. Jeśli skończysz rundę bez punktów albo się poddasz, tracisz jedno z trzech żyć.",
    en: "If you find the smallest possible number of countries, you get 3 points. Every extra country costs 1 point. If you end a round with no points or give up, you lose one of three lives.",
  },
  rules_end: {
    pl: "Na początku gry optymalnym wynikiem są 2 kraje. Co 10 punktów ich liczba rośnie, aż do 5. Gra kończy się wygraną po zdobyciu 50 punktów albo przegraną po utracie wszystkich żyć.",
    en: "At the start of the game the best result is 2 countries. Every 10 points this number grows, up to 5. The game ends with a win when you reach 50 points, or with a loss when all lives are gone.",
  },
  rules_neighbors_head: {
    pl: "Wymień wszystkich sąsiadów zaznaczonego kraju.",
    en: "Name all neighbors of the marked country.",
  },
  rules_neighbors_intro: {
    pl: "Na mapie ({map=map|zwykłej} lub {map=blank|pustej}) zaznaczony będzie jeden kraj. Podaj ({input=typing|wpisz} lub {input=buttons|kliknij}) nazwy wszystkich krajów, z którymi graniczy. Liczą się tylko granice lądowe. Gra obejmuje kraje Europy, Azji i Afryki.",
    en: "One country will be marked on the map ({map=map|a full one} or {map=blank|a blank one}). Name ({input=typing|type} or {input=buttons|click}) all the countries it borders. Only land borders count. The game covers the countries of Europe, Asia and Africa.",
  },
  rules_neighbors_scoring: {
    pl: "Jeśli wymienisz wszystkich sąsiadów bez pomyłki, dostaniesz 3 punkty. Każdy kraj, który nie jest sąsiadem, kosztuje 1 punkt. Jeśli skończysz rundę bez punktów albo się poddasz, tracisz jedno z trzech żyć.",
    en: "If you name all neighbors without a mistake, you get 3 points. Every country that is not a neighbor costs 1 point. If you end a round with no points or give up, you lose one of three lives.",
  },
  rules_neighbors_timed: {
    pl: "Możesz grać {time=untimed|bez ograniczenia czasu} lub {time=timed|z limitem 20, 30 lub 40 sekund na rundę, zależnie od poziomu}.",
    en: "You can play {time=untimed|with no time restriction} or {time=timed|with a limit of 20, 30 or 40 seconds per round, depending on the level}.",
  },
  rules_neighbors_end: {
    pl: "Zaczynasz od krajów z 2 lub 3 sąsiadami. Po zdobyciu 10 punktów przechodzisz do krajów z 4 lub 5 sąsiadami, a po 20 punktach do krajów z 6 do 9 sąsiadami. Gra kończy się wygraną po zdobyciu 40 punktów albo przegraną po utracie wszystkich żyć.",
    en: "You start with countries that have 2 or 3 neighbors. At 10 points you move on to countries with 4 or 5 neighbors, and at 20 points to countries with 6 to 9 neighbors. The game ends with a win when you reach 40 points, or with a loss when all lives are gone.",
  },
  label_toggles: { pl: "Wybierz tryb gry", en: "Choose the game mode" },
  play: { pl: "Zagraj", en: "Play" },

  mode_paths: { pl: "Trasy", en: "Routes" },
  mode_paths_desc: { pl: "połącz dwa kraje lądem", en: "link two countries by land" },
  mode_neighbors: { pl: "Sąsiedzi", en: "Neighbors" },
  mode_neighbors_desc: { pl: "wymień sąsiadów kraju", en: "name the neighbors of a country" },


  toggle_buttons: { pl: "Przyciski", en: "Buttons" },
  toggle_typing: { pl: "Pisanie", en: "Typing" },
  toggle_timed: { pl: "Na czas", en: "Timed" },
  toggle_untimed: { pl: "Bez czasu", en: "Untimed" },
  toggle_map: { pl: "Mapa", en: "Map" },
  toggle_blank: { pl: "Pusta mapa", en: "Blank map" },

  // ---------- Game screen ----------
  input_placeholder: { pl: "Wpisz nazwę kraju", en: "Type a country name" },
  check: { pl: "Sprawdź", en: "Check" },
  give_up: { pl: "Poddaj rundę", en: "Give up the round" },
  next_round: { pl: "Dalej", en: "Next" },
  end_game: { pl: "Zakończ grę", en: "End game" },
  status_level: { pl: "Poziom", en: "Level" },
  status_score: { pl: "Suma punktów", en: "Total score" },
  // Countries on a shortest route; points still possible in the round / points it gave
  optimal_path: {
    pl: (n) => `Optymalna trasa: ${n} ${plural(n, "kraj", "kraje", "krajów")}`,
    en: (n) => `Optimal route: ${n} ${n === 1 ? "country" : "countries"}`,
  },
  neighbor_count: {
    pl: (n) => `Liczba sąsiadów: ${n}`,
    en: (n) => `Number of neighbors: ${n}`,
  },
  round_pool: { pl: "Pula punktów:", en: "Points pool:" },
  // count = number of all shortest routes
  map_reset: { pl: "Przywróć widok", en: "Reset view" },
  show_ways: {
    pl: (count) => `Pokaż wszystkie najkrótsze trasy (${count})`,
    en: (count) => `Show all shortest routes (${count})`,
  },
  ways_count: {
    pl: (count) => `Liczba najkrótszych tras: ${count}`,
    en: (count) => `Number of shortest routes: ${count}`,
  },
  round_result: { pl: "Wynik rundy:", en: "Round score:" },

  // After the round, next to a guessed country of another shortest route
  other_way: { pl: "na innej najkrótszej trasie", en: "on another shortest route" },
  // Only after a won round: complete shortest routes the player found
  one_of_ways: {
    pl: (n) => `na jednej z ${n} znalezionych tras`,
    en: (n) => `on one of ${n} routes found`,
  },
  repeat: {
    pl: (name) => `${name} już jest na mapie`,
    en: (name) => `${name} is already on the map`,
  },
  // Typed text not recognized (more fitting countries: just the suggestions)
  unknown: {
    pl: (text) => `Nie znam kraju „${text}”`,
    en: (text) => `Unknown country "${text}"`,
  },

  time_left: { pl: "Czas", en: "Time" },
  time_out: { pl: "Koniec czasu.", en: "Time is up." },
  // End of the round: what it changed in the game (note under the input)
  level_up: { pl: "Gratulacje! Nowy poziom!", en: "Congratulations! You've levelled up!" },
  life_lost: {
    pl: (lives) =>
      `${plural(lives, "Zostało", "Zostały", "Zostało")} ${lives} ${plural(lives, "życie", "życia", "żyć")}.`,
    en: (lives) => `${lives} ${lives === 1 ? "life" : "lives"} left.`,
  },
  // End of the whole game (big note at the top; the score is in the status card)
  game_won: { pl: "Gratulacje!\nWygrałeś/aś!", en: "Congratulations!\nYou've won!" },
  game_over: { pl: "Koniec gry", en: "Game over" },
  free_play: { pl: "Graj dalej bez punktów", en: "Play on without points" },
  free_mode: { pl: "Gra bez punktów", en: "Playing without points" },
  // Routes, after a win: length of the routes when playing on
  bonus_length: { pl: "Optymalna trasa:", en: "Optimal route:" },
  bonus_option: {
    pl: (n) => `${n} ${plural(n, "kraj", "kraje", "krajów")}`,
    en: (n) => `${n} ${n === 1 ? "country" : "countries"}`,
  },
};

export const hasText = (key) => key in TEXTS;

export function t(key, ...args) {
  return textIn(lang, key, ...args);
}

// A text in the given language (not the current one)
export function textIn(language, key, ...args) {
  const text = TEXTS[key][language];
  return typeof text === "function" ? text(...args) : text;
}

// Text with parts tied to a game mode switch state: "{field=state|words}" becomes
// <span data-toggle="field=state">words</span> (highlighted on the start screen)
export function fillText(element, text) {
  const parts = text.split(/\{(\w+=\w+)\|([^}]*)\}/);
  element.replaceChildren(
    ...parts.map((part, i) => {
      if (i % 3 === 0) return part;
      if (i % 3 === 2) return "";
      const span = document.createElement("span");
      span.dataset.toggle = part;
      span.textContent = parts[i + 1];
      return span;
    })
  );
}

// Texts of the page: elements with data-text="key" (content)
// and data-placeholder="key" (input placeholder)
export function applyTexts() {
  document.documentElement.lang = lang;
  document.title = t("title");
  for (const element of document.querySelectorAll("[data-text]")) {
    fillText(element, t(element.dataset.text));
  }
  for (const element of document.querySelectorAll("[data-placeholder]")) {
    element.placeholder = t(element.dataset.placeholder);
  }
}
