// The browser calls this function: /api/anime-extras?id=<malId>
// Collects extra info about one anime from many sources AT THE SAME TIME:
//   reviews (MAL, AniList, Kitsu), legal watch links, Wikipedia background,
//   TMDB images + provider names, AniList banner + tags.
// One source failing never breaks the answer. The whole result is cached 6 hours.

import { animeById, malReviews, jikanIsDown } from "../adapters/jikan.js";
import { animeExtras, animeBase } from "../adapters/anilist.js";
import { kitsuExtras } from "../adapters/kitsu.js";
import { wikidataForMal } from "../adapters/wikidata.js";
import { wikipediaSummary, wikipediaSearch } from "../adapters/wikipedia.js";
import { tmdbExtras } from "../adapters/tmdb.js";
import { buildExtras } from "../shared/extrasBuilder.js";
import { cached, jsonResponse } from "../shared/cache.js";

const ONE_DAY = 60 * 60 * 24;
const SIX_HOURS = 60 * 60 * 6;
const SOURCE_TIMEOUT_MS = 8000;

// Gives a source at most `ms` milliseconds; after that it counts as failed.
function withTimeout(promise, ms = SOURCE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Source timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Unwraps an allSettled result: the value, or null if that source failed.
const value = (r) => (r.status === "fulfilled" ? r.value : null);

// Does all the work for one anime. Returns the response object, or null if the
// anime does not exist. Throws (so nothing is cached) if EVERY source failed.
async function loadExtras(id) {
  // Everything together must finish in ~9s (Netlify stops functions at 10s).
  const deadline = Date.now() + 9000;
  const timeLeft = () => Math.max(500, Math.min(SOURCE_TIMEOUT_MS, deadline - Date.now()));
  // The base anime gives us the titles/year/type that other sources need.
  // AniList first; Jikan only if AniList throws (and Jikan is not known to be down).
  const base = await cached(`animebase:${id}`, ONE_DAY, async () => {
    try {
      return await withTimeout(animeBase(id), 6500);
    } catch (err) {
      if (err.status === 503) throw err;
      console.error("AniList base failed, trying Jikan:", err.message);
      if (deadline - Date.now() < 2000) throw err; // no time left for Jikan
      return withTimeout(animeById(id), Math.min(4500, timeLeft()));
    }
  });
  if (!base) return null;

  // Wikidata first (it may know the Wikipedia article title) ...
  const wikidataP = withTimeout(wikidataForMal(id), timeLeft());
  // ... then Wikipedia: use that title, or search by our titles if there is none.
  const wikipediaP = withTimeout(
    (async () => {
      let wd = null;
      try { wd = await wikidataP; } catch { wd = null; }
      let title = wd?.enWikipediaTitle || null;
      if (!title) title = await wikipediaSearch([base.titleEnglish, base.title]);
      return title ? await wikipediaSummary(title) : null;
    })(),
    timeLeft()
  );

  const settled = await Promise.allSettled([
    // MAL reviews are a bonus: skip them completely when Jikan is known to be down.
    jikanIsDown() ? Promise.reject(new Error("Jikan skipped")) : withTimeout(malReviews(id), timeLeft()),
    withTimeout(animeExtras(id), timeLeft()),
    withTimeout(kitsuExtras(id), timeLeft()),
    wikidataP,
    wikipediaP,
    withTimeout(tmdbExtras({
      title: base.title,
      titleEnglish: base.titleEnglish,
      year: base.year,
      type: base.type,
    }), timeLeft()),
  ]);

  // Every source failed (not just "no data"): do not cache this.
  if (settled.every((r) => r.status === "rejected")) {
    const err = new Error("All sources failed");
    err.status = 502;
    throw err;
  }
  // If any source was just too busy and nothing else answered, it counts as a failure above.

  const [mal, anilist, kitsu, wikidata, wikipedia, tmdb] = settled.map(value);
  return buildExtras({ base, anilist, kitsu, mal, wikidata, wikipedia, tmdb });
}

export default async (request) => {
  const p = new URL(request.url).searchParams;
  const rawId = (p.get("id") || "").trim();

  // The id must be a plain positive whole number, at most 7 digits.
  if (!/^[0-9]{1,7}$/.test(rawId) || parseInt(rawId, 10) < 1) {
    return jsonResponse({ error: "id must be a positive whole number" }, 60, 400);
  }
  const id = parseInt(rawId, 10);

  try {
    const result = await cached(`extras:${id}`, SIX_HOURS, () => loadExtras(id));
    if (!result) return jsonResponse({ error: "Anime not found" }, 3600, 404);
    return jsonResponse(result, SIX_HOURS);
  } catch (err) {
    if (err.status === 503) {
      return jsonResponse({ error: "Busy, please try again in a moment" }, 1, 503);
    }
    return jsonResponse({ error: "Could not load extra info right now." }, 1, 502);
  }
};

export const config = { path: "/api/anime-extras" };
