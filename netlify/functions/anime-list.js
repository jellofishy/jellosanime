// The browser calls this function: /api/anime-list?kind=top|airing|popular|season|search
// It asks AniList first (the main source). If AniList is down it falls back to Jikan.
// The answer is cached, and the reply says which source answered (`credits`).

import { topAnime, thisSeason, searchAnime } from "../adapters/jikan.js";
import { catalogList } from "../adapters/anilist.js";
import { genreIdsToAniList } from "../shared/malGenres.js";
import { cached, jsonResponse } from "../shared/cache.js";

const ONE_DAY = 60 * 60 * 24;

// Search filters we accept, and the only values each may have.
// (No "rx": adult ratings are never allowed.)
const ALLOWED = {
  type: ["tv", "movie", "ova", "special", "ona", "music"],
  status: ["airing", "complete", "upcoming"],
  rating: ["g", "pg", "pg13", "r17", "r"],
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEASONS = ["winter", "spring", "summer", "fall"];
const ORDER_BY = ["score", "popularity", "rank", "start_date", "title", "episodes"];
const SORT = ["asc", "desc"];
const GENRES = /^\d{1,4}(,\d{1,4}){0,4}$/; // up to 5 numeric ids, like "1,22"

// Returns only the valid filters from the URL; bad values are dropped.
function cleanFilters(p) {
  const out = {};
  for (const key of Object.keys(ALLOWED)) {
    const v = (p.get(key) || "").trim().toLowerCase();
    if (ALLOWED[key].includes(v)) out[key] = v;
  }
  const genres = (p.get("genres") || "").trim();
  if (GENRES.test(genres)) out.genres = genres;
  for (const key of ["start_date", "end_date"]) {
    const v = (p.get(key) || "").trim();
    if (DATE.test(v)) out[key] = v;
  }
  // year: 4 digits, 1960..2100
  const year = (p.get("year") || "").trim();
  if (/^\d{4}$/.test(year) && +year >= 1960 && +year <= 2100) out.year = year;
  const season = (p.get("season") || "").trim().toLowerCase();
  if (SEASONS.includes(season)) out.season = season;
  const orderBy = (p.get("order_by") || "").trim().toLowerCase();
  if (ORDER_BY.includes(orderBy)) out.order_by = orderBy;
  const sort = (p.get("sort") || "").trim().toLowerCase();
  if (SORT.includes(sort)) out.sort = sort;
  return out;
}

// Our "type" values -> AniList formats.
const FORMATS = { tv: "TV", movie: "MOVIE", ova: "OVA", special: "SPECIAL", ona: "ONA", music: "MUSIC" };
// Our "status" values -> AniList statuses.
const STATUSES = { airing: "RELEASING", complete: "FINISHED", upcoming: "NOT_YET_RELEASED" };
// order_by -> [sort when going down (desc), sort when going up (asc)]. null = no such AniList sort.
const SORTS = {
  score: ["SCORE_DESC", "SCORE"],
  popularity: ["POPULARITY_DESC", "POPULARITY"],
  rank: ["SCORE_DESC", "SCORE"],
  start_date: ["START_DATE_DESC", "START_DATE"],
  title: ["TITLE_ROMAJI", "TITLE_ROMAJI_DESC"],
  episodes: ["EPISODES_DESC", "EPISODES"],
};

// "2020-04-01" -> 20200401 (AniList's date number). `shift` moves it one day outward
// because AniList's startDate_greater / startDate_lesser are exclusive.
const dateToInt = (d, shift = 0) => Number(d.replace(/-/g, "")) + shift;

// Current season name for today's date (winter Jan-Mar, spring Apr-Jun, summer Jul-Sep, fall Oct-Dec).
export function currentSeason(now = new Date()) {
  const m = now.getUTCMonth(); // 0..11
  return { season: SEASONS[Math.floor(m / 3)], year: now.getUTCFullYear() };
}

// Turns our search options into AniList options. `rating` has no AniList version: ignored.
export function searchToAniList(q, filters) {
  const opts = { q: q || undefined };
  if (filters.genres) opts.genres = genreIdsToAniList(filters.genres);
  if (filters.type) opts.format = FORMATS[filters.type];
  if (filters.status) opts.status = STATUSES[filters.status];
  if (filters.year) opts.year = Number(filters.year);
  if (filters.season) opts.season = filters.season.toUpperCase();
  if (filters.start_date) opts.startDateGreater = dateToInt(filters.start_date, -1);
  if (filters.end_date) opts.startDateLesser = dateToInt(filters.end_date, 1);
  // Sorting: a text search ranks by best match; otherwise use order_by (default best-rated first).
  const pair = SORTS[filters.order_by || "score"];
  if (q) opts.sort = "SEARCH_MATCH";
  else opts.sort = filters.sort === "asc" ? pair[1] : pair[0];
  return opts;
}

// Runs the AniList way first, then the Jikan way if AniList is unreachable.
// Jikan has a "circuit breaker", so when it is known to be down this fails instantly.
async function fromEitherSource(anilistWay, jikanWay) {
  const started = Date.now();
  try {
    return { ...(await anilistWay()), credits: ["AniList"] };
  } catch (err) {
    if (err.status === 503) throw err; // our own "busy" signal
    console.error("AniList list failed, trying Jikan:", err.message);
  }
  // Keep the whole function under Netlify's 10s: Jikan only gets what time is left.
  const left = 9000 - (Date.now() - started);
  if (left < 1000) throw new Error("No time left for Jikan");
  let timer;
  const giveUp = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("Jikan too slow"), { status: 502 })), left);
  });
  try {
    return { ...(await Promise.race([jikanWay(), giveUp])), credits: ["Jikan"] };
  } finally {
    clearTimeout(timer);
  }
}

export default async (request) => {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind") || "top";
  // page is 1..50; limit is 1..24 (bad or missing numbers fall back to defaults).
  const page = Math.min(50, Math.max(1, parseInt(p.get("page") || "1", 10) || 1));
  const limit = Math.min(24, Math.max(1, parseInt(p.get("limit") || "12", 10) || 12));

  try {
    let data;
    let ttl = ONE_DAY;

    if (kind === "top") {
      data = await cached(`top:${page}:${limit}`, ttl, () => fromEitherSource(
        () => catalogList({ sort: "SCORE_DESC", page, limit }),
        () => topAnime({ page, limit })));
    } else if (kind === "popular") {
      data = await cached(`pop:${page}:${limit}`, ttl, () => fromEitherSource(
        () => catalogList({ sort: "POPULARITY_DESC", page, limit }),
        () => topAnime({ filter: "bypopularity", page, limit })));
    } else if (kind === "airing") {
      ttl = 60 * 60;
      data = await cached(`airing:${page}:${limit}`, ttl, () => fromEitherSource(
        () => catalogList({ sort: "POPULARITY_DESC", status: "RELEASING", page, limit }),
        () => topAnime({ filter: "airing", page, limit })));
    } else if (kind === "season") {
      // The season changes over time, so the cache key holds it too.
      const now = currentSeason();
      data = await cached(`season:${now.year}${now.season}:${page}:${limit}`, ttl, () => fromEitherSource(
        () => catalogList({ sort: "POPULARITY_DESC", season: now.season.toUpperCase(), year: now.year, page, limit }),
        () => thisSeason({ page, limit })));
    } else if (kind === "search") {
      // Only valid, allowed filters get through (see cleanFilters).
      const filters = cleanFilters(p);
      // Lower-case and tidy spaces so "Naruto" and "naruto " share one cached answer.
      const q = (p.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
      const cacheKey = `search:${q}:${page}:${limit}:${JSON.stringify(filters)}`;
      ttl = 60 * 60;
      data = await cached(cacheKey, ttl, () => fromEitherSource(async () => {
        const opts = searchToAniList(q, filters);
        // Genre ids we do not list (adult or unknown) match nothing: never ignore them.
        if (filters.genres && !opts.genres.length) return { results: [], hasNextPage: false };
        return catalogList({ ...opts, page, limit });
      }, () => searchAnime({ q, page, limit, ...filters })));
    } else {
      return jsonResponse({ error: "Unknown kind" }, 60, 400);
    }
    // If the backup source (Jikan) answered, only remember it for 5 minutes so we return to AniList quickly.
    if (data?.credits?.[0] === "Jikan") ttl = 300;
    return jsonResponse(data, ttl);
  } catch (err) {
    // Too many requests waiting: tell the browser to try again soon.
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    // Don't let the CDN remember errors.
    console.error("anime-list failed:", err.message);
    return jsonResponse({ error: "Could not load anime right now." }, 1, 502);
  }
};

// Gives the function a friendly URL.
export const config = { path: "/api/anime-list" };
