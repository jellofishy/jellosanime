// The browser calls this function: /api/anime-list?kind=top|airing|popular|season|search
// It asks Jikan (through our rate-limited adapter), caches the answer, and replies.

import { topAnime, thisSeason, searchAnime } from "../adapters/jikan.js";
import { cached, jsonResponse } from "../shared/cache.js";

const ONE_DAY = 60 * 60 * 24;

export default async (request) => {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind") || "top";
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
  const limit = Math.min(24, parseInt(p.get("limit") || "12", 10) || 12);

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
      // Only pass along the filters we allow (never anything else).
      const filters = {};
      for (const key of ["genres", "type", "status", "rating", "start_date", "end_date"]) {
        if (p.get(key)) filters[key] = p.get(key);
      }
      const q = (p.get("q") || "").trim().slice(0, 100);
      const cacheKey = `search:${q}:${page}:${limit}:${JSON.stringify(filters)}`;
      ttl = 60 * 60;
      data = await cached(cacheKey, ttl, () => searchAnime({ q, page, limit, ...filters }));
    } else {
      return jsonResponse({ error: "Unknown kind" }, 60, 400);
    }
    return jsonResponse(data, ttl);
  } catch (err) {
    // Don't let the CDN remember errors.
    return jsonResponse({ error: "Could not load anime right now." }, 1, 502);
  }
};

// Gives the function a friendly URL.
export const config = { path: "/api/anime-list" };
