// Asks our Netlify Function for the EXTRA info about one anime
// (reviews, where to watch, background text, images, tags).
// Kept separate from the base details so the page can show up fast
// and fill these sections in afterwards.
// Throws an Error with .status when the request fails.
export async function fetchAnimeExtras(id) {
  const res = await fetch(`/api/anime-extras?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = new Error("Could not load extras");
    err.status = res.status;
    throw err;
  }
  return res.json();
}
