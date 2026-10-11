// Matching typed country names (any case, with or without diacritics, spaces, dashes).

// "Wybrzeże Kości Słoniowej" -> "wybrzezekoscisloniowej"
export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l") // not split by NFD
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9]/g, "");
}

// Names of a country in one language: main name + alternative ones
export function namesIn(country, lang) {
  return [country.name[lang], ...(country.alt?.[lang] ?? [])];
}

// countries = {code: {name: {pl, en}, alt?: {pl?: [...], en?: [...]}}};
// match() knows only names in `lang`; suggest() also finds names in other languages
// (shown after the ones in `lang`)
export function createNameIndex(countries, lang) {
  const exact = {}; // normalized name in lang -> Set of codes (more than one = ambiguous, e.g. "Korea")
  // [normalized text from a word start to the name end, code, rank if it starts with the query]
  const starts = [];
  for (const [code, country] of Object.entries(countries)) {
    for (const nameLang of Object.keys(country.name)) {
      const own = nameLang === lang;
      for (const name of namesIn(country, nameLang)) {
        if (own) (exact[normalize(name)] ??= new Set()).add(code);
        const words = name.split(/[\s-]+/);
        words.forEach((_, i) => {
          const rank = (own ? 1 : 3) + (i === 0 ? 0 : 1);
          starts.push([normalize(words.slice(i).join("")), code, rank]);
        });
      }
    }
  }

  return {
    // Codes of countries with exactly this name: [], [code] or more (ambiguous)
    match(text) {
      return [...(exact[normalize(text)] ?? [])];
    },
    // Codes of countries with a name (or a word in it) starting with the text:
    // exact matches first, then names starting with it, then words starting with it;
    // the same for names in other languages after that
    suggest(text, limit) {
      const query = normalize(text);
      if (!query) return [];
      const rank = {};
      const add = (code, r) => (rank[code] = Math.min(rank[code] ?? r, r));
      for (const code of exact[query] ?? []) add(code, 0);
      for (const [rest, code, r] of starts) {
        if (rest.startsWith(query)) add(code, r);
      }
      return Object.keys(rank)
        .sort((a, b) => {
          const byName = countries[a].name[lang].localeCompare(countries[b].name[lang], lang);
          return rank[a] - rank[b] || byName;
        })
        .slice(0, limit);
    },
  };
}
