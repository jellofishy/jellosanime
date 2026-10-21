// The browser calls this function: /api/anime-detail?id=<malId>
// It gets one anime's full details from AniList (Jikan is only the backup), adds a "who it's for" blurb,
// caches the answer for a day, and replies.

import { animeBase } from "../adapters/anilist.js";
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
      // AniList first. If it throws (down / busy), try Jikan, which fails fast when it is known to be down.
      let anime;
      let source = "AniList";
      try {
        anime = await animeBase(id);
      } catch (err) {
        if (err.status === 503) throw err;
        console.error("AniList detail failed, trying Jikan:", err.message);
        source = "Jikan";
        anime = await animeById(id);
      }
      if (!anime) return null;

      return {
        anime: { ...anime, whoItsFor: whoItsFor(anime) },
        // LATER: add more sections here as separate keys, for example:
        //   anilist: await anilistExtras(id),
        //   reviews: await reviewsFor(id),
        //   whereToWatch: await whereToWatch(id),
        // and add each source's name to `credits` below.
        credits: [source],
      };
    });

    if (!result) return jsonResponse({ error: "Anime not found" }, 3600, 404);
    return jsonResponse(result, ONE_DAY);
  } catch (err) {
    // Too many requests waiting: tell the browser to try again soon.
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    // Don't let the CDN remember errors, and don't leak details.
    return jsonResponse({ error: "Could not load this anime right now." }, 1, 502);
  }
};

// Gives the function a friendly URL.
export const config = { path: "/api/anime-detail" };
