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
    if (!res.ok) {
      const err = new Error(`Jikan error ${res.status}`);
      err.status = res.status; // lets callers spot a 404 (not found)
      throw err;
    }
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
  // Safety net: drop adult items BEFORE cleaning, whatever Jikan sent.
  const safe = (json.data || []).filter((raw) => !isAdult(raw));
  return {
    results: dedupe(safe.map(cleanAnime)),
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

// True if this raw anime is adult content (we never show it).
export function isAdult(raw) {
  if (String(raw.rating || "").startsWith("Rx")) return true;
  const adultNames = ["Hentai", "Erotica"];
  const tags = [...(raw.genres || []), ...(raw.explicit_genres || [])];
  return tags.some((g) => adultNames.includes(g.name));
}

// Pure helper: raw Jikan "full" anime -> our shape plus the detail-page extras.
export function cleanAnimeDetail(raw) {
  const names = (list) => (list || []).map((x) => x.name);
  const a = cleanAnime(raw);
  a.titleJapanese = raw.title_japanese || "";
  a.themes = names(raw.themes);
  a.demographics = names(raw.demographics);
  a.aired = raw.aired?.string || "";
  a.duration = raw.duration || "";
  a.rank = raw.rank ?? null;
  a.popularity = raw.popularity ?? null;
  a.members = raw.members ?? null;
  a.producers = names(raw.producers);
  a.malUrl = raw.url || "";
  return a;
}

// Full details for one anime. Returns null if not found or adult content.
export async function animeById(id) {
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) throw new Error("Invalid id");
  let json;
  try {
    json = await jikanGet(`/anime/${num}/full`);
  } catch (err) {
    if (err.status === 404) return null; // no such anime
    throw err;
  }
  const raw = json.data;
  if (!raw || isAdult(raw)) return null;
  return cleanAnimeDetail(raw);
}

export async function searchAnime({ q, page = 1, limit = 24, ...filters } = {}) {
  return toList(await jikanGet("/anime", { q, page, limit, order_by: q ? undefined : "score", sort: q ? undefined : "desc", ...filters }));
}
