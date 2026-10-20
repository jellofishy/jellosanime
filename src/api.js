// Small helper the pages use to ask OUR Netlify Function for anime.
// (The browser never talks to Jikan directly.)
export async function fetchAnimeList(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/anime-list?${query}`);
  if (!res.ok) throw new Error("Could not load anime");
  return res.json(); // { results: [...], hasNextPage: true/false }
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
