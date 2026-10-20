// The browser calls this function: /api/genres
// The list of anime genres (no adult ones), from Jikan. Cached 7 days.

import { genreList } from "../adapters/jikan.js";
import { cached, jsonResponse } from "../shared/cache.js";

const TTL = 60 * 60 * 24 * 7;

export default async () => {
  try {
    const genres = await cached("genres", TTL, () => genreList());
    return jsonResponse({ genres, credits: ["Jikan"] }, TTL);
  } catch (err) {
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    return jsonResponse({ error: "Could not load genres right now." }, 1, 502);
  }
};

export const config = { path: "/api/genres" };
