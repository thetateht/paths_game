// Loads game data from data/.

async function loadJson(name) {
  const response = await fetch(`data/${name}`);
  if (!response.ok) {
    throw new Error(`Cannot load ${name}: ${response.status}`);
  }
  return response.json();
}

// Returns {countries, borders, neighbors, areas, centroids}:
// countries = {code: {name: {pl, en}}}, borders = {code: [neighbor codes]} (game countries only),
// neighbors = the same plus small countries (Neighbors mode),
// areas = {code: km²}, centroids = {code: [lon, lat]}
export async function loadData() {
  const [countries, borders, neighbors, mapIndex] = await Promise.all([
    loadJson("countries.json"),
    loadJson("borders.json"),
    loadJson("neighbors.json"),
    loadJson("map/index.json"),
  ]);
  return { countries, borders, neighbors, areas: mapIndex.areas, centroids: mapIndex.centroids };
}
