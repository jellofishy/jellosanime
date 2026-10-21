// AniList adapter: talks to AniList (GraphQL) and converts its answers into
// our shared formats (see docs/CONTRACTS.md).
// Docs: https://docs.anilist.co/   Limit: 90 requests/min (30/min when degraded).
// We link everything to the MyAnimeList ID (malId), the master key.

import { emptyAnime } from "../shared/animeShape.js";
import { createLimiter, sleep } from "../shared/rateLimiter.js";

const ENDPOINT = "https://graphql.anilist.co";

// Stay under the "degraded" limit of 30 per minute, with a gap between calls.
const limited = createLimiter({ gapMs: 800, perMinute: 30 });

// Sends one GraphQL query. Each try waits at most 6s, and the whole call (waiting in line,
// tries and one retry) stays under ~8.5s so the Netlify function never passes its 10s limit.
// Retries ONCE on 429, and only when AniList says to wait 2 seconds or less.
const TRY_TIMEOUT_MS = 6000;
const TOTAL_BUDGET_MS = 8500;

async function anilistQuery(query, variables = {}) {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await limited(() => {
      const left = deadline - Date.now();
      if (left < 500) {
        const err = new Error("AniList took too long");
        err.status = 504;
        throw err;
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(TRY_TIMEOUT_MS, left));
      return fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
    });

    if (res.status === 429) {
      // Retry-After is in seconds. Only retry when it is short (<= 2s), else give up fast.
      const secs = Number(res.headers?.get?.("Retry-After")) || 5;
      if (attempt === 1 || secs > 2) break;
      await sleep(secs * 1000);
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

// ---------- catalog (top / popular / season / search) ----------

// AniList format -> MAL-style type text (what the website showed when Jikan was the source).
const TYPE_TEXT = { TV: "TV", TV_SHORT: "TV", MOVIE: "Movie", OVA: "OVA", ONA: "ONA", SPECIAL: "Special", MUSIC: "Music" };
// AniList status -> MAL-style status text.
const STATUS_TEXT = {
  RELEASING: "Currently Airing",
  FINISHED: "Finished Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};
export const typeText = (format) => TYPE_TEXT[format] || "";
export const statusText = (status) => STATUS_TEXT[status] || "";

// Fields every catalog card needs (same as trending).
const CARD_FIELDS = `
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
  trailer { id site }`;

// Raw AniList media -> shared anime shape for the catalog (MAL-style type/status text).
export function cleanCatalogMedia(m) {
  const a = cleanMedia(m);
  if (!a) return null;
  a.type = typeText(m.format);
  a.status = statusText(m.status);
  // Only keep a real YouTube id (it ends up inside an embed URL).
  a.trailerYoutubeId = m.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(m.trailer.id || "") ? m.trailer.id : "";
  a.year = m.seasonYear ?? m.startDate?.year ?? null;
  return a;
}

// The AniList argument types for every filter we may send.
const FILTER_TYPES = {
  q: ["search", "String"],
  genres: ["genre_in", "[String]"],
  format: ["format", "MediaFormat"],
  status: ["status", "MediaStatus"],
  year: ["seasonYear", "Int"],
  season: ["season", "MediaSeason"],
  startDateGreater: ["startDate_greater", "FuzzyDateInt"],
  startDateLesser: ["startDate_lesser", "FuzzyDateInt"],
};

// Pure helper: builds the GraphQL text + variables, including ONLY the filters that are set.
export function buildCatalogQuery({ sort, page = 1, limit = 12, ...filters } = {}) {
  const decls = ["$page: Int", "$perPage: Int", "$sort: [MediaSort]"];
  const args = ["type: ANIME", "isAdult: false", "sort: $sort"];
  const variables = { page, perPage: limit, sort: [sort || "POPULARITY_DESC"] };
  for (const [key, [argName, type]] of Object.entries(FILTER_TYPES)) {
    const v = filters[key];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) continue; // unset -> leave the argument out completely
    decls.push(`$${key}: ${type}`);
    args.push(`${argName}: $${key}`);
    variables[key] = v;
  }
  const query = `
query (${decls.join(", ")}) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(${args.join(", ")}) {${CARD_FIELDS}
    }
  }
}`;
  return { query, variables };
}

// One page of the catalog -> { results, hasNextPage }. Throws if AniList is unreachable.
// Items without a MAL id (or adult ones) are skipped, so a page may hold fewer than `limit`.
export async function catalogList({ sort, page = 1, limit = 12, ...filters } = {}) {
  const perPage = Math.max(1, Math.min(Number(limit) || 12, 50));
  const { query, variables } = buildCatalogQuery({ sort, page: Math.max(1, Number(page) || 1), limit: perPage, ...filters });
  const json = await anilistQuery(query, variables);
  const data = json.data?.Page;
  const seen = new Set();
  const results = [];
  for (const m of data?.media || []) {
    const a = cleanCatalogMedia(m);
    if (!a || seen.has(a.malId)) continue;
    seen.add(a.malId);
    results.push(a);
  }
  return { results, hasNextPage: data?.pageInfo?.hasNextPage ?? false };
}

// ---------- one anime's full details (same shape as jikan.js animeById) ----------

const BASE_QUERY = `
query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    idMal
    isAdult
    title { romaji english native }
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
    startDate { year month day }
    endDate { year month day }
    duration
    popularity
    rankings { rank type allTime }
    studios { nodes { name isAnimationStudio } }
    trailer { id site }
  }
}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// {year, month, day} (any may be null) -> "Apr 6, 1998" / "Apr 1998" / "1998" / "".
export function formatFuzzyDate(d) {
  if (!d || !d.year) return "";
  if (!d.month) return String(d.year);
  const mon = MONTHS[d.month - 1] || "";
  return d.day ? `${mon} ${d.day}, ${d.year}` : `${mon} ${d.year}`;
}

// start/end -> "Apr 6, 1998 to Apr 24, 1999" (MAL style). "" if the start is unknown.
export function formatAired(start, end) {
  const s = formatFuzzyDate(start);
  if (!s) return "";
  const e = formatFuzzyDate(end);
  if (!e) return `${s} to ?`;
  return e === s ? s : `${s} to ${e}`;
}

// Description with HTML (<br>, <i>, <b> ...) turned into plain text. Keeps line breaks as spaces.
export function plainSynopsis(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Raw AniList Media -> the same object jikan.js animeById returns. Null if adult / no MAL id.
export function cleanAnimeBase(m) {
  if (!m || !m.idMal || m.isAdult === true) return null;
  const a = emptyAnime();
  const studios = m.studios?.nodes || [];
  const rated = (m.rankings || []).find((r) => r.type === "RATED" && r.allTime);
  a.malId = m.idMal;
  a.title = m.title?.romaji || "";
  a.titleEnglish = m.title?.english || "";
  a.image = m.coverImage?.large || "";
  a.banner = m.bannerImage || "";
  a.synopsis = plainSynopsis(m.description);
  a.genres = m.genres || [];
  a.type = typeText(m.format);
  a.episodes = m.episodes ?? null;
  a.status = statusText(m.status);
  a.score = scale10(m.averageScore);
  a.year = m.seasonYear || m.startDate?.year || null;
  a.season = (m.season || "").toLowerCase();
  a.rating = ""; // AniList has no age rating
  a.studios = studios.filter((s) => s.isAnimationStudio).map((s) => s.name);
  a.trailerYoutubeId = m.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(m.trailer.id || "") ? m.trailer.id : "";
  a.source = "anilist";
  a.titleJapanese = m.title?.native || "";
  a.themes = [];
  a.demographics = [];
  a.aired = formatAired(m.startDate, m.endDate);
  a.duration = m.duration ? `${m.duration} min per ep` : "";
  a.rank = rated ? rated.rank : null;
  a.popularity = m.popularity ?? null;
  a.members = m.popularity ?? null;
  a.producers = studios.filter((s) => !s.isAnimationStudio).map((s) => s.name);
  a.malUrl = `https://myanimelist.net/anime/${m.idMal}`;
  return a;
}

// Full details for one anime by MAL id. Null if AniList doesn't know it (or adult). Throws on failure.
export async function animeBase(malId) {
  const num = Number(malId);
  if (!Number.isInteger(num) || num <= 0) throw new Error("Invalid id");
  const json = await anilistQuery(BASE_QUERY, { id: num });
  return cleanAnimeBase(json.data?.Media);
}
