// AniList adapter: talks to AniList (GraphQL) and converts its answers into
// our shared formats (see docs/CONTRACTS.md).
// Docs: https://docs.anilist.co/   Limit: 90 requests/min (30/min when degraded).
// We link everything to the MyAnimeList ID (malId), the master key.

import { emptyAnime } from "../shared/animeShape.js";
import { createLimiter, sleep } from "../shared/rateLimiter.js";

const ENDPOINT = "https://graphql.anilist.co";

// Stay under the "degraded" limit of 30 per minute, with a gap between calls.
const limited = createLimiter({ gapMs: 800, perMinute: 30 });

// Sends one GraphQL query. Retries ONCE if AniList says 429 (too many requests).
async function anilistQuery(query, variables = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await limited(() => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000); // give up after 8s
      return fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
    });

    if (res.status === 429) {
      if (attempt === 1) break; // already retried once
      // Retry-After is in seconds. Wait that long (max 65s), default 5s.
      const secs = Number(res.headers?.get?.("Retry-After")) || 5;
      await sleep(Math.min(secs, 65) * 1000);
      continue;
    }

    let json = null;
    try { json = await res.json(); } catch { /* not JSON */ }

    // AniList answers 404 when e.g. Media(idMal) matches nothing: that means "not found".
    if (res.status === 404 || json?.errors?.some((e) => e.status === 404)) {
      return { data: null, notFound: true };
    }
    if (!res.ok || json?.errors) {
      const err = new Error(`AniList error ${res.status}: ${json?.errors?.[0]?.message || ""}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }
  const err = new Error("AniList is busy, try again soon");
  err.status = 429;
  throw err;
}

// ---------- small pure helpers (easy to test offline) ----------

// Cuts text to max characters, adding "…" if it was cut.
export function cut(text, max = 300) {
  const s = String(text || "");
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// Removes HTML tags, markdown bits and spoiler tags from text.
export function stripMarkup(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/~!.*?!~/gs, "")               // AniList spoiler syntax ~!...!~
    .replace(/<[^>]*>/g, "")                // HTML tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links/images -> text
    .replace(/[*_`#>~]+/g, "")              // markdown symbols
    .replace(/\s+/g, " ")
    .trim();
}

// AniList score is 0-100; ours is 0-10 (or null).
export function scale10(n) {
  return typeof n === "number" && n > 0 ? Math.round(n) / 10 : null;
}

// Unix seconds of 00:00 UTC for the day containing `date`.
export function startOfDayUtc(date = new Date()) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

// One raw airingSchedules entry -> AiringItem, or null if it must be skipped
// (no MAL id, or adult).
export function cleanAiring(raw) {
  const m = raw?.media;
  if (!m || !m.idMal || m.isAdult === true) return null;
  return {
    malId: m.idMal,
    title: m.title?.romaji || "",
    titleEnglish: m.title?.english || "",
    image: m.coverImage?.large || "",
    banner: m.bannerImage || "",
    genres: m.genres || [],
    episode: raw.episode,
    airingAt: raw.airingAt,
    score: scale10(m.averageScore),
    format: m.format || "",
  };
}

// Raw AniList review -> our Review shape (body is never returned, only a short excerpt).
export function cleanReview(raw) {
  const score10 = scale10(raw.score);
  let recommended = null;
  if (raw.score >= 60) recommended = true;
  else if (raw.score > 0 && raw.score <= 40) recommended = false;
  return {
    source: "anilist",
    author: raw.user?.name || "",
    score: score10,
    recommended,
    excerpt: cut(stripMarkup(raw.summary), 300),
    url: raw.siteUrl || "",
    date: raw.createdAt ? new Date(raw.createdAt * 1000).toISOString() : "",
  };
}

// Raw AniList media -> our shared anime shape. Returns null if no MAL id or adult.
export function cleanMedia(m) {
  if (!m || !m.idMal || m.isAdult === true) return null;
  const a = emptyAnime();
  a.malId = m.idMal;
  a.title = m.title?.romaji || "";
  a.titleEnglish = m.title?.english || "";
  a.image = m.coverImage?.large || "";
  a.banner = m.bannerImage || "";
  a.synopsis = stripMarkup(m.description);
  a.genres = m.genres || [];
  a.type = m.format || "";
  a.episodes = m.episodes ?? null;
  a.status = m.status || "";
  a.score = scale10(m.averageScore);
  a.year = m.seasonYear ?? null;
  a.season = (m.season || "").toLowerCase();
  a.studios = (m.studios?.nodes || []).map((s) => s.name);
  a.trailerYoutubeId = m.trailer?.site === "youtube" ? m.trailer.id || "" : "";
  a.source = "anilist";
  return a;
}

// Tags: hide spoiler/adult ones, top 12 by rank.
export function cleanTags(tags) {
  return (tags || [])
    .filter((t) => !t.isMediaSpoiler && !t.isAdult)
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 12)
    .map((t) => ({ name: t.name, rank: t.rank ?? 0 }));
}

// Legal-site links come from externalLinks of type STREAMING (raw; Back-end filters them).
export function cleanStreamLinks(externalLinks) {
  return (externalLinks || [])
    .filter((l) => l.type === "STREAMING" && l.url)
    .map((l) => ({ url: l.url, label: l.site || "", source: "anilist" }));
}

// One link per distinct site found in streamingEpisodes.
export function cleanEpisodeLinks(streamingEpisodes) {
  const seen = new Set();
  const out = [];
  for (const e of streamingEpisodes || []) {
    if (!e.url || !e.site || seen.has(e.site)) continue;
    seen.add(e.site);
    out.push({ url: e.url, label: e.site, source: "anilist" });
  }
  return out;
}

// ---------- the things the rest of the site can ask for ----------

const AIRING_QUERY = `
query ($page: Int, $from: Int, $to: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
      airingAt
      episode
      media {
        idMal
        title { romaji english }
        coverImage { large }
        bannerImage
        genres
        averageScore
        format
        isAdult
        countryOfOrigin
      }
    }
  }
}`;

// Episodes airing today (UTC day). Up to 3 pages, no adult, no missing MAL id.
export async function airingToday() {
  const from = startOfDayUtc() - 1;       // "greater than" so start 1s earlier
  const to = startOfDayUtc() + 86400;     // start of tomorrow
  const seen = new Set();
  const items = [];
  for (let page = 1; page <= 3; page++) {
    const json = await anilistQuery(AIRING_QUERY, { page, from, to });
    const data = json.data?.Page;
    if (!data) break;
    for (const raw of data.airingSchedules || []) {
      const item = cleanAiring(raw);
      if (!item) continue;
      const key = `${item.malId}-${item.episode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
    if (!data.pageInfo?.hasNextPage) break;
  }
  return items;
}

const TRENDING_QUERY = `
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      idMal
      title { romaji english }
      coverImage { large }
      bannerImage
      description(asHtml: false)
      genres
      format
      episodes
      status
      averageScore
      seasonYear
      season
      isAdult
      studios(isMain: true) { nodes { name } }
      trailer { id site }
    }
  }
}`;

// Currently trending anime (shared shape), skipping ones without a MAL id.
export async function trending(limit = 12) {
  const n = Math.max(1, Math.min(Number(limit) || 12, 25));
  // Ask for extra because some have no MAL id and get skipped.
  const json = await anilistQuery(TRENDING_QUERY, { perPage: Math.min(n * 2, 50) });
  const list = (json.data?.Page?.media || []).map(cleanMedia).filter(Boolean);
  return list.slice(0, n);
}

const EXTRAS_QUERY = `
query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    id
    isAdult
    bannerImage
    tags { name rank isMediaSpoiler isAdult }
    externalLinks { url site type }
    streamingEpisodes { site url }
    reviews(limit: 5, sort: RATING_DESC) {
      nodes { id summary score body(asHtml: false) rating ratingAmount createdAt user { name } siteUrl }
    }
  }
}`;

// Extra info for one anime by MAL id. Returns null if AniList doesn't know it (or adult).
export async function animeExtras(malId) {
  const num = Number(malId);
  if (!Number.isInteger(num) || num <= 0) throw new Error("Invalid id");
  const json = await anilistQuery(EXTRAS_QUERY, { id: num });
  const m = json.data?.Media;
  if (!m || m.isAdult === true) return null;
  return {
    anilistId: m.id,
    banner: m.bannerImage || "",
    tags: cleanTags(m.tags),
    externalLinks: cleanStreamLinks(m.externalLinks),
    streamingEpisodesLinks: cleanEpisodeLinks(m.streamingEpisodes),
    reviews: (m.reviews?.nodes || []).map(cleanReview),
  };
}
