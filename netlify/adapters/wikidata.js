// Wikidata adapter: given a MyAnimeList id, finds the matching Wikidata item
// and its AniList id, Kitsu id and English Wikipedia article title.
// Docs: https://www.wikidata.org/wiki/Wikidata:Data_access  (SPARQL endpoint)
// Properties: P4086 = MAL anime id, P8729 = AniList anime id, P4082 = Kitsu anime id.

import { createLimiter } from "../shared/rateLimiter.js";

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "jellosanime/1.0 (https://github.com/jellofishy/jellosanime; contact via repo issues)";
const TIMEOUT_MS = 8000;

// Stay light on Wikimedia: 300ms apart and at most 60 per minute.
const limited = createLimiter({ gapMs: 300, perMinute: 60 });

// Pure helper: a MAL id must be plain digits. Returns the digit string or null.
// This runs BEFORE the id goes into the query, so nothing can be injected.
export function cleanMalId(malId) {
  const s = String(malId ?? "").trim();
  if (!/^[0-9]{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? String(n) : null; // also drops leading zeros
}

// Pure helper: builds the SPARQL query text for an already-validated id.
export function buildQuery(safeId) {
  return (
    `SELECT ?item ?al ?kitsu ?article WHERE { ` +
    `?item wdt:P4086 "${safeId}" . ` +
    `OPTIONAL{?item wdt:P8729 ?al} ` +
    `OPTIONAL{?item wdt:P4082 ?kitsu} ` +
    `OPTIONAL{ ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> } ` +
    `} LIMIT 1`
  );
}

// Pure helper: "https://en.wikipedia.org/wiki/Attack_on_Titan" -> "Attack on Titan".
// Returns "" if it is not an English Wikipedia article link.
export function titleFromArticleUrl(url) {
  const prefix = "https://en.wikipedia.org/wiki/";
  if (typeof url !== "string" || !url.startsWith(prefix)) return "";
  try {
    return decodeURIComponent(url.slice(prefix.length)).replace(/_/g, " ").trim();
  } catch {
    return ""; // badly encoded link
  }
}

// Pure helper: turns the raw SPARQL JSON into our small result (or null).
export function parseSparql(json) {
  const row = json?.results?.bindings?.[0];
  if (!row) return null;
  const qid = String(row.item?.value || "").split("/").pop();
  if (!/^Q[0-9]+$/.test(qid)) return null;
  const digits = (v) => (/^[0-9]+$/.test(String(v ?? "")) ? Number(v) : null);
  return {
    qid,
    anilistId: digits(row.al?.value),
    kitsuId: digits(row.kitsu?.value),
    enWikipediaTitle: titleFromArticleUrl(row.article?.value),
  };
}

// Looks up one anime by MAL id. Returns null if the id is bad or Wikidata has no item.
export async function wikidataForMal(malId) {
  const safeId = cleanMalId(malId);
  if (!safeId) return null; // not digits: refuse, never build a query

  const url = new URL(ENDPOINT);
  url.searchParams.set("format", "json");
  url.searchParams.set("query", buildQuery(safeId));

  const res = await limited(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`Wikidata error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return parseSparql(await res.json());
}
