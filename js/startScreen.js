// Start screen: language switcher, rules of the chosen game mode, choices, Play button.
import { LANGUAGES, currentLang, setLang, applyTexts, hasText, t, textIn, fillText } from "./texts.js";

const el = (id) => document.getElementById(id);

// options: {field: {key: {...}}} for the button groups (field = "mode";
// button texts: t(`${field}_${key}`), t(`${field}_${key}_desc`));
// toggles: {field: [left state, right state]} for the two-state switches;
// choice: {mode, ...toggle fields}, changed in place; onPlay(): Play clicked;
// onLang(): language changed.
export function createStartScreen({ options, toggles, choice, onPlay, onLang }) {
  // Rules of the chosen mode in the current language, with the words of the chosen switch
  // states highlighted
  function update() {
    for (const layer of document.querySelectorAll(".rules-layer")) {
      const shown = layer.dataset.lang === currentLang() && layer.dataset.mode === choice.mode;
      layer.classList.toggle("hidden-layer", !shown);
    }
    for (const p of document.querySelectorAll(".rules-card [data-toggle]")) {
      const [field, state] = p.dataset.toggle.split("=");
      p.classList.toggle("highlight", choice[field] === state);
    }
  }

  // Rules of every game type in every language, one over another (only one visible,
  // see update), so the card has the height of the longest one
  function fillRules() {
    const modes = [...el("rules-template").content.children];
    el("rules-card").replaceChildren(
      ...LANGUAGES.flatMap((lang) =>
        modes.map((mode) => {
          const layer = document.createElement("div");
          layer.className = "rules-layer";
          layer.dataset.lang = lang;
          layer.dataset.mode = mode.dataset.mode;
          layer.append(...mode.cloneNode(true).children);
          for (const p of layer.querySelectorAll("[data-rules]")) {
            fillText(p, textIn(lang, p.dataset.rules));
          }
          return layer;
        })
      )
    );
  }

  // Texts depend on the language, so the buttons are rebuilt with it
  function render() {
    applyTexts();
    fillRules();
    for (const [field, opts] of Object.entries(options)) {
      fillChoices(el(`${field}-choices`), field, opts, choice, update);
    }
    el("toggles").replaceChildren(
      ...Object.entries(toggles).map(([field, states]) => toggle(field, states, choice, update))
    );
    fillLanguages();
    update();
  }

  function fillLanguages() {
    el("lang-switcher").replaceChildren(
      ...LANGUAGES.map((lang) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-lang";
        button.classList.toggle("selected", lang === currentLang());
        button.textContent = lang.toUpperCase();
        button.addEventListener("click", () => {
          setLang(lang);
          render();
          onLang();
        });
        return button;
      })
    );
  }

  el("play").addEventListener("click", onPlay);
  render();
}

// One button per option; the chosen one is marked
function fillChoices(container, field, opts, choice, onChange) {
  const buttons = Object.keys(opts).map((key) => {
    const button = choiceButton(`${field}_${key}`);
    button.dataset.key = key;
    button.addEventListener("click", () => {
      choice[field] = key;
      markSelected();
      onChange();
    });
    return button;
  });
  const markSelected = () => {
    for (const b of buttons) b.classList.toggle("selected", b.dataset.key === choice[field]);
  };
  container.replaceChildren(...buttons);
  markSelected();
}

// Button with a name and an optional description
function choiceButton(textKey) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-choice";
  const span = (className, text) => {
    const s = document.createElement("span");
    s.className = className;
    s.textContent = text;
    return s;
  };
  button.append(span("choice-name", t(textKey)));
  if (hasText(`${textKey}_desc`)) button.append(span("choice-desc", t(`${textKey}_desc`)));
  return button;
}

// Two-state switch: one button, the chosen half dark. Clicking switches to the other state.
function toggle(field, [left, right], choice, onChange) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn toggle";
  const half = (state) => {
    const span = document.createElement("span");
    span.textContent = t(`toggle_${state}`);
    return span;
  };
  button.append(half(left), half(right));
  const show = () => button.classList.toggle("right", choice[field] === right);
  button.addEventListener("click", () => {
    choice[field] = choice[field] === left ? right : left;
    show();
    onChange();
  });
  show();
  return button;
}
