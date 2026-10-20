// Small helper the pages use to ask OUR Netlify Function for anime.
// (The browser never talks to Jikan directly.)
export async function fetchAnimeList(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/anime-list?${query}`);
  if (!res.ok) throw new Error("Could not load anime");
  return res.json(); // { results: [...], hasNextPage: true/false }
}
