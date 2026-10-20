// Kitsu adapter: finds the Kitsu version of an anime (from its MyAnimeList id)
// and returns extras: streaming links, community reactions (reviews), age rating.
// Docs: https://kitsu.docs.apiary.io/   Base: https://kitsu.io/api/edge  (no key needed)
// Rules (docs/CONTRACTS.md): no data -> null / [], adult content is never returned.

import { createLimiter, sleep } from "../shared/rateLimiter.js";

const BASE = "https://kitsu.io/api/edge";
const TIMEOUT_MS = 8000;

// Be polite: 500ms apart and at most 40 per minute.
const limited = createLimiter({ gapMs: 500, perMinute: 40 });

// Fetches one Kitsu URL and returns the parsed JSON.
// `query` is a plain object, e.g. { "filter[animeId]": "1", include: "user" }.
// Returns null when Kitsu says 404 (not found). Retries briefly on 429 / 5xx.
async function kitsuGet(path, query = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await limited(async () => {
      // Give up on a slow request after ~8 seconds.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        return await fetch(url, {
          headers: { Accept: "application/vnd.api+json" },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    });
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) {
      lastStatus = res.status;
      await sleep(1000 * (attempt + 1)); // tiny back-off, then try again
      continue;
    }
    if (!res.ok) {
      const err = new Error(`Kitsu error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  const err = new Error(`Kitsu is busy (${lastStatus}), try again soon`);
  err.status = lastStatus;
  throw err;
}

// Removes HTML / markdown / spoiler tags and extra spaces from review text.
function stripText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")                 // html tags
    .replace(/\[\/?spoiler\]/gi, " ")         // [spoiler] tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")    // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")  // markdown links -> link text
    .replace(/[*_~`>#]+/g, "")                // markdown marks
    .replace(/\s+/g, " ")
    .trim();
}

// Cuts text to `max` characters, adding "…" if it was cut.
function cut(text, max = 300) {
  const chars = Array.from(text); // safe for emoji
  if (chars.length <= max) return text;
  return chars.slice(0, max - 1).join("").trimEnd() + "…";
}

// --- Pure helpers (no network, easy to test) ---

// One raw Kitsu streaming-link resource -> raw stream link.
// `streamers` is a map { streamerId: siteName } built from the "included" list.
// Returns null if the link has no usable url.
export function cleanStreamingLink(raw, streamers = {}) {
  const url = raw?.attributes?.url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  const streamerId = raw?.relationships?.streamer?.data?.id;
  return {
    url,
    label: (streamerId && streamers[streamerId]) || "",
    source: "kitsu",
  };
}

// One raw Kitsu media-reaction resource -> Review (see CONTRACTS.md).
// `users` is a map { userId: name }; `animeUrl` is the anime page on Kitsu.
// Reactions have no 0-10 score, but if a "rating" (0-20) exists we halve it.
// Returns null if there is no text.
export function cleanReview(raw, users = {}, animeUrl = "") {
  const a = raw?.attributes || {};
  const text = stripText(a.reaction ?? a.content ?? "");
  if (!text) return null;

  let score = null;
  if (typeof a.rating === "number" && a.rating >= 0 && a.rating <= 20) {
    score = Math.round((a.rating / 2) * 10) / 10;
  }
  const userId = raw?.relationships?.user?.data?.id;
  return {
    source: "kitsu",
    author: (userId && users[userId]) || "Kitsu user",
    score,
    recommended: null, // Kitsu reactions do not say "recommended"
    excerpt: cut(text, 300),
    url: animeUrl,
    date: a.createdAt || "",
  };
}

// True if Kitsu marks this anime as adult.
export function isAdultKitsu(attributes = {}) {
  return attributes.nsfw === true || String(attributes.ageRating || "").toUpperCase() === "R18";
}

// Builds { id: name } from JSON:API "included" items of one type.
function includedNames(json, type, field) {
  const map = {};
  for (const item of json?.included || []) {
    if (item.type === type) map[item.id] = item.attributes?.[field] || "";
  }
  return map;
}

// --- The things the rest of the site can ask for ---

// MyAnimeList id -> Kitsu id (string), or null if Kitsu has no mapping.
export async function kitsuIdFromMal(malId) {
  const num = Number(malId);
  if (!Number.isInteger(num) || num <= 0) return null;
  const json = await kitsuGet("/mappings", {
    "filter[externalSite]": "myanimelist/anime",
    "filter[externalId]": String(num),
    include: "item",
  });
  // Take the included item that is an anime.
  const item = (json?.included || []).find((i) => i.type === "anime");
  return item ? String(item.id) : null;
}

// Extras for one anime. Returns null if there is no Kitsu match or it is adult.
// Each section fails alone: a broken one becomes [] / "" instead of an error.
export async function kitsuExtras(malId) {
  const kitsuId = await kitsuIdFromMal(malId);
  if (!kitsuId) return null;

  // The anime itself: adult check, age rating, slug for the page link.
  const animeJson = await kitsuGet(`/anime/${kitsuId}`);
  const attrs = animeJson?.data?.attributes;
  if (!attrs || isAdultKitsu(attrs)) return null;
  const animeUrl = `https://kitsu.app/anime/${attrs.slug || kitsuId}`;

  // Streaming links (with the streamer site name).
  let streamingLinks = [];
  try {
    const json = await kitsuGet(`/anime/${kitsuId}/streaming-links`, { include: "streamer" });
    const streamers = includedNames(json, "streamers", "siteName");
    streamingLinks = (json?.data || [])
      .map((l) => cleanStreamingLink(l, streamers))
      .filter(Boolean);
  } catch {
    streamingLinks = [];
  }

  // Reviews: Kitsu "media reactions", most up-voted first.
  let reviews = [];
  try {
    const json = await kitsuGet("/media-reactions", {
      "filter[animeId]": kitsuId,
      sort: "-upVotesCount",
      include: "user",
      "page[limit]": "5",
    });
    const users = includedNames(json, "users", "name");
    reviews = (json?.data || [])
      .map((r) => cleanReview(r, users, animeUrl))
      .filter(Boolean);
  } catch {
    reviews = [];
  }

  return {
    kitsuId,
    streamingLinks,
    reviews,
    ageRating: attrs.ageRating || "",
    ageRatingGuide: attrs.ageRatingGuide || "",
  };
}
