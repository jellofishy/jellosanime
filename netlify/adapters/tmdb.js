// TMDB adapter: finds the matching movie/TV entry on The Movie Database and
// returns extra backdrop images + "where to watch" provider names/logos.
// Docs: https://developer.themoviedb.org/docs   Terms: https://www.themoviedb.org/api-terms-of-use
//
// SECRET: the key lives ONLY in process.env.TMDB_API_KEY. It is never logged,
// never returned and never put in an error message. Without a key every
// function quietly returns null so the site still works.
//
// TMDB rules worth remembering (from their API terms):
//  - show the TMDB logo + the attribution notice somewhere visible,
//  - do not cache TMDB data longer than 6 months,
//  - commercial use (ads, paid features) needs a separate agreement with TMDB.

import { createLimiter } from "../shared/rateLimiter.js";

const BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/";
const REGION = "US";
const TIMEOUT_MS = 8000;

// Exact wording from TMDB's API terms (section 3, Attribution).
export const TMDB_ATTRIBUTION_TEXT =
  "This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

// TMDB's short blue logo (UNVERIFIED path, see TMDB's brand assets page).
export const TMDB_LOGO_URL =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

// Polite: 150ms apart, at most 120 per minute.
const limited = createLimiter({ gapMs: 150, perMinute: 120 });

// ---------- key handling (never leaks the key) ----------

// Reads the key. Returns { token, isV4 } or null when there is no key.
function readKey() {
  const key = String(process.env.TMDB_API_KEY || "").trim();
  if (!key) return null;
  // A v4 read-access token is a long JWT that starts with "eyJ"; a v3 key is 32 hex chars.
  const isV4 = key.startsWith("eyJ") || key.length > 40;
  return { key, isV4 };
}

// One GET to TMDB. Returns parsed JSON, or null for 404. Errors are generic on purpose
// (no URL, no key) so a secret can never end up in a log.
async function tmdbGet(path, params = {}) {
  const auth = readKey();
  if (!auth) return null;

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const headers = { Accept: "application/json" };
  if (auth.isV4) headers.Authorization = `Bearer ${auth.key}`;
  else url.searchParams.set("api_key", auth.key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await limited(() => fetch(url, { headers, signal: controller.signal }));
  } catch {
    throw new Error("TMDB request failed"); // deliberately generic
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`TMDB error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  try {
    return await res.json();
  } catch {
    throw new Error("TMDB sent an unreadable answer");
  }
}

// ---------- pure helpers (easy to test offline) ----------

// "Fullmetal Alchemist: Brotherhood!" -> "fullmetal alchemist brotherhood"
export function normalizeTitle(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// 0..1 similarity: 1 = identical words, 0 = nothing in common.
export function titleSimilarity(a, b) {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const sx = new Set(x.split(" "));
  const sy = new Set(y.split(" "));
  let shared = 0;
  for (const w of sx) if (sy.has(w)) shared++;
  return shared / (sx.size + sy.size - shared); // Jaccard overlap
}

// Year of a search result (tv uses first_air_date, movie uses release_date).
export function resultYear(r) {
  const d = r?.first_air_date || r?.release_date || "";
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// Picks the best search result, or null. A wrong match is worse than none, so:
//  - adult results are skipped,
//  - the year must be within 1 of `year` (if we know the year; if we don't, only an exact title counts),
//  - the title must match well (>= 0.8 similarity against title or original title).
export function pickBestMatch(results, titles, year) {
  const wanted = (titles || []).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const r of results || []) {
    if (!r || r.adult === true) continue;
    const ry = resultYear(r);
    if (year && (ry === null || Math.abs(ry - year) > 1)) continue;
    const names = [r.name, r.original_name, r.title, r.original_title].filter(Boolean);
    let score = 0;
    for (const w of wanted) for (const n of names) score = Math.max(score, titleSimilarity(w, n));
    if (score < 0.8) continue;
    if (!year && score < 1) continue;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

// Builds an image URL, e.g. imageUrl("/abc.jpg", "w780"). Empty string if no path.
export function imageUrl(path, size) {
  return path ? `${IMG_BASE}${size}${path}` : "";
}

// Up to 6 backdrop URLs (best voted first), from TMDB's "images" block.
export function pickBackdrops(images, max = 6) {
  const list = Array.isArray(images?.backdrops) ? [...images.backdrops] : [];
  list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  return list
    .map((b) => imageUrl(b.file_path, "w1280"))
    .filter(Boolean)
    .slice(0, max);
}

// Turns TMDB's provider list into [{ name, logo }] (names/logos only: never a stream link).
function cleanProviderList(list) {
  return (Array.isArray(list) ? list : [])
    .filter((p) => p && p.provider_name)
    .map((p) => ({ name: String(p.provider_name), logo: imageUrl(p.logo_path, "w92") }));
}

// Takes the "watch/providers" block and returns our shape for REGION.
// `link` is TMDB's own (JustWatch-powered) page; the back-end decides how to use it.
export function cleanWatchProviders(block, region = REGION) {
  const r = block?.results?.[region] || {};
  const link = typeof r.link === "string" && r.link.startsWith("https://www.themoviedb.org/") ? r.link : "";
  return {
    link,
    flatrate: cleanProviderList(r.flatrate),
    free: cleanProviderList(r.free),
    ads: cleanProviderList(r.ads),
  };
}

// ---------- the main function ----------

// Finds the TMDB entry for an anime and returns extras, or null (no key / no safe match).
export async function tmdbExtras({ title, titleEnglish, year, type } = {}) {
  if (!readKey()) return null; // site works fine without TMDB

  const mediaType = String(type || "").toLowerCase() === "movie" ? "movie" : "tv";
  const y = Number(year) > 0 ? Number(year) : null;

  // Try the English title first, then the romaji one (skip duplicates/empties).
  const tries = [...new Set([titleEnglish, title].map((t) => String(t || "").trim()).filter(Boolean))];
  if (tries.length === 0) return null;

  let match = null;
  for (const q of tries) {
    const json = await tmdbGet(`/search/${mediaType}`, {
      query: q,
      include_adult: "false",
      language: "en-US",
      page: 1,
    });
    match = pickBestMatch(json?.results, tries, y);
    if (match) break;
  }
  if (!match) return null;

  // One call for details: images + watch providers together.
  const detail = await tmdbGet(`/${mediaType}/${match.id}`, {
    append_to_response: "images,watch/providers",
    include_image_language: "en,null",
    language: "en-US",
  });
  if (!detail || detail.adult === true) return null;

  return {
    tmdbId: match.id,
    mediaType,
    images: pickBackdrops(detail.images),
    watchProviders: cleanWatchProviders(detail["watch/providers"]),
    attribution: TMDB_ATTRIBUTION_TEXT,
    logoUrl: TMDB_LOGO_URL,
  };
}
