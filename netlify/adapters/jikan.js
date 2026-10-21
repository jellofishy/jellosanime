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

  // Netlify cuts a function off after ~10 seconds, so keep the total under that:
  // each try gets 4 seconds, and we retry only once (on "slow down" or a server hiccup).
  let lastStatus = "no answer";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await limited(() =>
        fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "jellosanime/1.0 (school project; https://jellosanime.netlify.app)" },
          signal: AbortSignal.timeout(4000),
        })
      );
      if (res.ok) return res.json();
      lastStatus = res.status;
      // Write what Jikan said into Netlify's function logs so problems can be diagnosed.
      console.error(`Jikan ${res.status} for ${path}: ${(await res.text()).slice(0, 200)}`);
      if (res.status === 429 || res.status >= 500) { await sleep(800); continue; }
      const err = new Error(`Jikan error ${res.status}`);
      err.status = res.status; // lets callers spot a 404 (not found)
      throw err;
    } catch (e) {
      if (e.status) throw e; // our own "Jikan error NNN" above
      lastStatus = e.name === "TimeoutError" ? "timeout" : e.message; // network trouble or too slow
      console.error(`Jikan request failed for ${path}: ${lastStatus}`);
    }
  }
  const err = new Error(`Jikan unavailable (${lastStatus})`);
  err.status = lastStatus === 429 ? 429 : 502;
  throw err;
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
  if (String(raw.rating || "").trim().toLowerCase().startsWith("rx")) return true; // "Rx", "rx"...
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

// --- Season / year -> date range ---

const SEASONS = {
  winter: ["01-01", "03-31"],
  spring: ["04-01", "06-30"],
  summer: ["07-01", "09-30"],
  fall: ["10-01", "12-31"],
};

// Pure helper: (year, season?) -> { start_date, end_date } as "YYYY-MM-DD".
// Returns null if the year is not 1960..2100 or the season is unknown.
export function seasonToDates(year, season) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1960 || y > 2100) return null;
  const s = String(season || "").toLowerCase();
  if (!s) return { start_date: `${y}-01-01`, end_date: `${y}-12-31` }; // whole year
  if (!SEASONS[s]) return null;
  return { start_date: `${y}-${SEASONS[s][0]}`, end_date: `${y}-${SEASONS[s][1]}` };
}

// Browse filters Jikan's /anime endpoint accepts that we pass straight through.
const PASS_THROUGH = ["genres", "type", "status", "rating", "start_date", "end_date", "order_by", "sort"];

// Pure helper: builds the Jikan query params from our search options.
export function buildSearchParams({ q, page = 1, limit = 24, year, season, ...filters } = {}) {
  const params = { q, page, limit };
  // Without a text search, default to best-rated first.
  if (!q) { params.order_by = "score"; params.sort = "desc"; }
  for (const key of PASS_THROUGH) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") params[key] = filters[key];
  }
  // year/season become a date range (an explicit start_date/end_date wins).
  if (year !== undefined && year !== null && year !== "") {
    const dates = seasonToDates(year, season);
    if (dates) {
      if (!params.start_date) params.start_date = dates.start_date;
      if (!params.end_date) params.end_date = dates.end_date;
    }
  }
  return params;
}

export async function searchAnime(options = {}) {
  return toList(await jikanGet("/anime", buildSearchParams(options)));
}

// --- Genres ---

// Adult genres we never list.
const BLOCKED_GENRES = ["hentai", "erotica"];

// Pure helper: raw Jikan genre list -> [{ id, name }] without adult genres.
export function cleanGenres(json) {
  return (json?.data || [])
    .filter((g) => g && g.mal_id && g.name && !BLOCKED_GENRES.includes(String(g.name).toLowerCase()))
    .map((g) => ({ id: g.mal_id, name: g.name }));
}

export async function genreList() {
  return cleanGenres(await jikanGet("/genres/anime", { filter: "genres" }));
}

// --- MAL reviews ---

// Pure helper: strips HTML/markdown/spoiler markers and cuts to 300 chars at a word boundary.
export function makeExcerpt(text, max = 300) {
  let t = String(text || "")
    .replace(/<[^>]*>/g, " ")                    // HTML tags
    .replace(/\[\/?spoiler[^\]]*\]/gi, " ")        // [spoiler] markers
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")   // markdown links/images -> text
    .replace(/[*_~`#>|]+/g, " ")                 // markdown symbols
    .replace(/\s+/g, " ")                        // newlines and extra spaces
    .trim();
  if (t.length <= max) return t;
  t = t.slice(0, max);
  const lastSpace = t.lastIndexOf(" ");
  if (lastSpace > max * 0.5) t = t.slice(0, lastSpace); // cut at a word boundary
  return t.replace(/[\s.,;:!?-]+$/, "") + "\u2026";
}

// Pure helper: one raw Jikan review -> Review, or null if it should be skipped.
export function cleanReview(raw) {
  if (!raw || raw.is_spoiler || raw.is_preliminary) return null;
  const url = String(raw.url || "");
  if (!url.startsWith("https://myanimelist.net/")) return null; // only real MAL links
  const tags = raw.tags || [];
  let recommended = null;
  if (tags.includes("Not Recommended")) recommended = false;
  else if (tags.includes("Recommended")) recommended = true;
  const score = Number(raw.score);
  return {
    source: "mal",
    author: raw.user?.username || "",
    score: Number.isFinite(score) && raw.score !== null ? score : null,
    recommended,
    excerpt: makeExcerpt(raw.review),
    url,
    date: raw.date || "",
  };
}

// Up to 5 MAL reviews (page 1, most helpful first). Returns [] when none / not found.
export async function malReviews(malId) {
  const num = Number(malId);
  if (!Number.isInteger(num) || num <= 0) return [];
  let json;
  try {
    json = await jikanGet(`/anime/${num}/reviews`, { page: 1, preliminary: "false", spoilers: "false" });
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
  const helpful = (r) => Number(r?.reactions?.overall) || 0;
  return (json.data || [])
    .slice()
    .sort((a, b) => helpful(b) - helpful(a))
    .map(cleanReview)
    .filter(Boolean)
    .slice(0, 5);
}
