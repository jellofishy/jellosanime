// The browser calls this function: /api/airing-today
// Anime episodes airing today, from AniList. Cached 15 minutes.

import { airingToday } from "../adapters/anilist.js";
import { cached, jsonResponse } from "../shared/cache.js";

const TTL = 60 * 15;

export default async () => {
  try {
    const results = await cached("airing-today", TTL, () => airingToday());
    return jsonResponse({ results, credits: ["AniList"] }, TTL);
  } catch (err) {
    // Too many requests waiting: tell the browser to try again soon.
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    // Don't let the CDN remember errors.
    return jsonResponse({ error: "Could not load today's anime right now." }, 1, 502);
  }
};

export const config = { path: "/api/airing-today" };
