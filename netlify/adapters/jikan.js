// Jikan adapter: talks to Jikan (the unofficial MyAnimeList API) and
// converts its answers into our shared anime format.
// Docs: https://docs.api.jikan.moe/   Limits: 3 requests/sec, 60/min.

import { emptyAnime } from "../shared/animeShape.js";
import { createLimiter, sleep } from "../shared/rateLimiter.js";

const BASE = "https://api.jikan.moe/v4";

// Stay safely under the limits: 400ms apart (2.5/sec) and 50 per minute.
const limited = createLimiter({ gapMs: 400, perMinute: 50 });

// Fetches one Jikan URL. If Jikan says "slow down" (429), wait and retry.
async function jikanGet(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  url.searchParams.set("sfw", "true"); // ALWAYS hide adult content

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await limited(() => fetch(url, { headers: { Accept: "application/json" } }));
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`Jikan error ${res.status}`);
    return res.json();
  }
  throw new Error("Jikan is busy, try again soon");
}

// Turns one raw Jikan anime into our shared shape.
export function cleanAnime(raw) {
  const a = emptyAnime();
  a.malId = raw.mal_id;
  a.title = raw.title || "";
  a.titleEnglish = raw.title_english || "";
  a.image = raw.images?.webp?.large_image_url || raw.images?.jpg?.large_image_url || "";
  a.synopsis = raw.synopsis || "";
  a.genres = (raw.genres || []).map((g) => g.name);
  a.type = raw.type || "";
  a.episodes = raw.episodes ?? null;
  a.status = raw.status || "";
  a.score = raw.score ?? null;
  a.year = raw.year ?? raw.aired?.prop?.from?.year ?? null;
  a.season = raw.season || "";
  a.rating = raw.rating || "";
  a.studios = (raw.studios || []).map((s) => s.name);
  a.trailerYoutubeId = raw.trailer?.youtube_id || "";
  return a;
}

// Jikan sometimes repeats a show across pages, so remove duplicates.
function dedupe(list) {
  const seen = new Set();
  return list.filter((a) => (seen.has(a.malId) ? false : seen.add(a.malId)));
}

function toList(json) {
  return {
    results: dedupe((json.data || []).map(cleanAnime)),
    hasNextPage: json.pagination?.has_next_page ?? false,
  };
}

// --- The things the rest of the site can ask for ---

export async function topAnime({ filter, page = 1, limit = 12 } = {}) {
  // filter can be: "airing", "bypopularity", or empty for best-rated overall
  return toList(await jikanGet("/top/anime", { filter, page, limit }));
}

export async function thisSeason({ page = 1, limit = 12 } = {}) {
  return toList(await jikanGet("/seasons/now", { page, limit }));
}

export async function searchAnime({ q, page = 1, limit = 24, ...filters } = {}) {
  return toList(await jikanGet("/anime", { q, page, limit, order_by: q ? undefined : "score", sort: q ? undefined : "desc", ...filters }));
}
