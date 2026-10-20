// The browser calls this function: /api/anime-detail?id=<malId>
// It gets one anime's full details from Jikan, adds a "who it's for" blurb,
// caches the answer for a day, and replies.

import { animeById } from "../adapters/jikan.js";
import { whoItsFor } from "../shared/whoItsFor.js";
import { cached, jsonResponse } from "../shared/cache.js";

const ONE_DAY = 60 * 60 * 24;

export default async (request) => {
  const p = new URL(request.url).searchParams;
  const rawId = (p.get("id") || "").trim();

  // The id must be a plain positive whole number, at most 7 digits.
  if (!/^[0-9]{1,7}$/.test(rawId) || parseInt(rawId, 10) < 1) {
    return jsonResponse({ error: "id must be a positive whole number" }, 60, 400);
  }
  const id = parseInt(rawId, 10);

  try {
    // Cache the finished answer (or "not found") so repeat visits are free.
    const result = await cached(`detail:${id}`, ONE_DAY, async () => {
      const anime = await animeById(id);
      if (!anime) return null;

      return {
        anime: { ...anime, whoItsFor: whoItsFor(anime) },
        // LATER: add more sections here as separate keys, for example:
        //   anilist: await anilistExtras(id),
        //   reviews: await reviewsFor(id),
        //   whereToWatch: await whereToWatch(id),
        // and add each source's name to `credits` below.
        credits: ["Jikan"],
      };
    });

    if (!result) return jsonResponse({ error: "Anime not found" }, 3600, 404);
    return jsonResponse(result, ONE_DAY);
  } catch (err) {
    // Don't let the CDN remember errors, and don't leak details.
    return jsonResponse({ error: "Could not load this anime right now." }, 1, 502);
  }
};

// Gives the function a friendly URL.
export const config = { path: "/api/anime-detail" };
