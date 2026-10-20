// The browser calls this function: /api/trending
// Currently trending anime, from AniList. Cached 1 hour.

import { trending } from "../adapters/anilist.js";
import { cached, jsonResponse } from "../shared/cache.js";

const TTL = 60 * 60;

export default async () => {
  try {
    const results = await cached("trending:12", TTL, () => trending(12));
    return jsonResponse({ results, credits: ["AniList"] }, TTL);
  } catch (err) {
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    return jsonResponse({ error: "Could not load trending anime right now." }, 1, 502);
  }
};

export const config = { path: "/api/trending" };
