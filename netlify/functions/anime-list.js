// The browser calls this function: /api/anime-list?kind=top|airing|popular|season|search
// It asks Jikan (through our rate-limited adapter), caches the answer, and replies.

import { topAnime, thisSeason, searchAnime } from "../adapters/jikan.js";
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
      data = await cached(`top:${page}:${limit}`, ttl, () => topAnime({ page, limit }));
    } else if (kind === "popular") {
      data = await cached(`pop:${page}:${limit}`, ttl, () => topAnime({ filter: "bypopularity", page, limit }));
    } else if (kind === "airing") {
      ttl = 60 * 60;
      data = await cached(`airing:${page}:${limit}`, ttl, () => topAnime({ filter: "airing", page, limit }));
    } else if (kind === "season") {
      data = await cached(`season:${page}:${limit}`, ttl, () => thisSeason({ page, limit }));
    } else if (kind === "search") {
      // Only valid, allowed filters get through (see cleanFilters).
      const filters = cleanFilters(p);
      // Lower-case and tidy spaces so "Naruto" and "naruto " share one cached answer.
      const q = (p.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
      const cacheKey = `search:${q}:${page}:${limit}:${JSON.stringify(filters)}`;
      ttl = 60 * 60;
      data = await cached(cacheKey, ttl, () => searchAnime({ q, page, limit, ...filters }));
    } else {
      return jsonResponse({ error: "Unknown kind" }, 60, 400);
    }
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
