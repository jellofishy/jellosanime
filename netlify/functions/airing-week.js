// The browser calls this function: /api/airing-week
// Anime episodes airing in the next 7 days, from AniList. Cached 30 minutes.
// The website groups them by the visitor's own local day.

import { airingWeek } from "../adapters/anilist.js";
import { cached, jsonResponse } from "../shared/cache.js";

const TTL = 60 * 30;

export default async () => {
  try {
    const results = await cached("airing-week", TTL, () => airingWeek());
    return jsonResponse({ results, credits: ["AniList"] }, TTL);
  } catch (err) {
    // Too many requests waiting: tell the browser to try again soon.
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    // Don't let the CDN remember errors.
    return jsonResponse({ error: "Could not load this week's schedule right now." }, 1, 502);
  }
};

export const config = { path: "/api/airing-week" };
