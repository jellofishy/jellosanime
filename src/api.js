// Small helper the pages use to ask OUR Netlify Function for anime.
// (The browser never talks to Jikan directly.)
export async function fetchAnimeList(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/anime-list?${query}`);
  if (!res.ok) throw new Error("Could not load anime");
  try {
    return await res.json(); // { results: [...], hasNextPage: true/false }
  } catch {
    throw new Error("Bad reply from server");
  }
}

// Asks our Netlify Function for ONE anime's full details.
// Throws an error with .status = 404 when the anime doesn't exist.
export async function fetchAnimeDetail(id) {
  const res = await fetch(`/api/anime-detail?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = new Error("Could not load anime");
    err.status = res.status;
    throw err;
  }
  return res.json(); // { anime: {...}, credits: ["Jikan"] }
}

// Reads a JSON answer safely: a failed request or a non-JSON reply becomes a normal Error.
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  try {
    return await res.json();
  } catch {
    throw new Error("Bad reply");
  }
}

// Shows airing today: { results: [AiringItem], credits }
export const fetchAiringToday = () => getJson("/api/airing-today");
// Trending anime: { results: [Anime], credits }
export const fetchTrending = () => getJson("/api/trending");
// Genre list: { genres: [{id, name}] }
export const fetchGenres = () => getJson("/api/genres");
