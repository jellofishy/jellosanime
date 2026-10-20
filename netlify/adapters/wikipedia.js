// Wikipedia adapter: short plain-text "background" summaries for an anime.
// Docs: https://en.wikipedia.org/api/rest_v1/  (page summary) and
//       https://www.mediawiki.org/wiki/API:Opensearch (title search fallback)
// Wikipedia text is CC BY-SA 4.0, so we always return the license + attribution.

import { createLimiter } from "../shared/rateLimiter.js";

const USER_AGENT = "jellosanime/1.0 (https://github.com/jellofishy/jellosanime; contact via repo issues)";
const TIMEOUT_MS = 8000;
const MAX_EXTRACT = 900;
const WIKI_PREFIX = "https://en.wikipedia.org/";

// Stay light on Wikimedia: 300ms apart and at most 60 per minute.
const limited = createLimiter({ gapMs: 300, perMinute: 60 });

// GET with a timeout and our User-Agent, through the limiter.
function wikiGet(url) {
  return limited(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  });
}

// Pure helper: plain text only, cut to ~900 chars at a sentence/word end.
export function cleanExtract(text) {
  const plain = String(text || "")
    .replace(/<[^>]*>/g, "")   // no HTML tags
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_EXTRACT) return plain;
  const cut = plain.slice(0, MAX_EXTRACT);
  const lastSentence = cut.lastIndexOf(". ");
  if (lastSentence > 400) return cut.slice(0, lastSentence + 1); // end on a full sentence
  return cut.slice(0, cut.lastIndexOf(" ")).trimEnd() + "…";
}

// Pure helper: only accept links that point at English Wikipedia.
export function safeWikiUrl(url) {
  return typeof url === "string" && url.startsWith(WIKI_PREFIX) ? url : "";
}

// Pure helper: raw REST summary JSON -> our shape (or null for disambiguation / empty).
export function cleanSummary(raw) {
  if (!raw || raw.type === "disambiguation") return null;
  const extract = cleanExtract(raw.extract);
  const url = safeWikiUrl(raw.content_urls?.desktop?.page);
  if (!extract || !url) return null;
  return {
    title: String(raw.title || ""),
    extract,
    url,
    license: "CC BY-SA 4.0",
    attribution: "Text from Wikipedia, available under CC BY-SA 4.0",
  };
}

// Fetches the summary of one article by title. Returns null if missing/ambiguous.
export async function wikipediaSummary(title) {
  const name = String(title || "").trim().replace(/\s+/g, "_");
  if (!name) return null;
  const res = await wikiGet(`${WIKI_PREFIX}api/rest_v1/page/summary/${encodeURIComponent(name)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`Wikipedia error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return cleanSummary(await res.json());
}

// --- Fallback search (used only when Wikidata has no article) ---

// Pure helper: lowercase, no punctuation, no "(anime)" style suffix.
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Pure helper: does a result title loosely match what we searched for?
// True when one normalized title contains the other (so "Naruto (TV series)" ~ "Naruto").
export function titlesMatch(resultTitle, guess) {
  const a = normalize(resultTitle);
  const b = normalize(guess);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Pure helper: opensearch JSON is [query, [titles], [descriptions], [urls]].
// Returns the first title that matches any guess, else null.
export function pickBestTitle(json, guesses) {
  const titles = Array.isArray(json?.[1]) ? json[1] : [];
  const first = titles[0]; // only trust the TOP result, to avoid wrong pages
  if (!first) return null;
  return guesses.some((g) => titlesMatch(first, g)) ? first : null;
}

// Finds a likely article title. titleGuess can be a string or an array of titles
// (e.g. [romaji, english]). Returns the title or null if unsure.
export async function wikipediaSearch(titleGuess) {
  const guesses = (Array.isArray(titleGuess) ? titleGuess : [titleGuess])
    .map((g) => String(g || "").trim())
    .filter(Boolean);
  if (guesses.length === 0) return null;

  const url = new URL(`${WIKI_PREFIX}w/api.php`);
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", `${guesses[0]} anime`); // "anime" nudges toward the right page
  url.searchParams.set("limit", "3");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");

  const res = await wikiGet(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`Wikipedia error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return pickBestTitle(await res.json(), guesses);
}
