// Pure helpers that turn the raw results of the extra sources into the
// /api/anime-extras response. No network here, so they are easy to test.
// SAFETY RULE: every URL that goes to the browser is checked again here
// (https only, known domain). Stream links only come from splitLinks()/searchLinks().

import { splitLinks, searchLinks } from "./streamingSites.js";

const MAX_REVIEWS = 12;

// Each review source may only link to its own website.
const REVIEW_HOSTS = {
  mal: ["myanimelist.net"],
  anilist: ["anilist.co"],
  kitsu: ["kitsu.app", "kitsu.io"],
};

// Parses a URL; returns a URL object only if it is https with no login/port, else null.
function safeHttps(url) {
  try {
    const u = new URL(String(url || "").trim());
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    return u;
  } catch {
    return null;
  }
}

// True if host is `domain` or a real subdomain of it.
function hostIs(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

// https URL string or "" (used for images and banners).
export function httpsOrEmpty(url) {
  const u = safeHttps(url);
  return u ? u.href : "";
}

// Checks one review again. Returns a clean Review or null (= drop it).
export function sanitizeReview(r, source) {
  if (!r || typeof r !== "object") return null;
  const u = safeHttps(r.url);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (!REVIEW_HOSTS[source].some((d) => hostIs(host, d))) return null;
  let excerpt = String(r.excerpt || "").trim();
  if (!excerpt) return null;
  if (excerpt.length > 300) excerpt = excerpt.slice(0, 299).trimEnd() + "…";
  const score = typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null;
  return {
    source,
    author: String(r.author || "").slice(0, 60),
    score,
    recommended: r.recommended === true || r.recommended === false ? r.recommended : null,
    excerpt,
    url: u.href,
    date: String(r.date || "").slice(0, 40),
  };
}

// Mixes the sources one by one (mal, anilist, kitsu, mal, ...) so each stays visible.
export function mergeReviews({ mal = [], anilist = [], kitsu = [] }) {
  const lists = [
    (mal || []).map((r) => sanitizeReview(r, "mal")).filter(Boolean),
    (anilist || []).map((r) => sanitizeReview(r, "anilist")).filter(Boolean),
    (kitsu || []).map((r) => sanitizeReview(r, "kitsu")).filter(Boolean),
  ];
  const out = [];
  for (let i = 0; out.length < MAX_REVIEWS; i++) {
    let added = false;
    for (const list of lists) {
      if (i < list.length && out.length < MAX_REVIEWS) {
        out.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

// Counts and average score of the merged reviews.
export function summarizeReviews(reviews) {
  const bySource = { mal: 0, anilist: 0, kitsu: 0 };
  let recommended = 0;
  let notRecommended = 0;
  let sum = 0;
  let scored = 0;
  for (const r of reviews) {
    bySource[r.source]++;
    if (r.recommended === true) recommended++;
    if (r.recommended === false) notRecommended++;
    if (typeof r.score === "number") { sum += r.score; scored++; }
  }
  return {
    count: reviews.length,
    bySource,
    averageScore: scored ? Math.round((sum / scored) * 10) / 10 : null,
    recommended,
    notRecommended,
  };
}

// Watch links: ONLY through the allowlist. searchLinks are always included.
export function buildWhereToWatch({ kitsu, anilist, title }) {
  const raw = [
    ...(kitsu?.streamingLinks || []),
    ...(anilist?.externalLinks || []),
    ...(anilist?.streamingEpisodesLinks || []),
  ];
  const { free, subscription } = splitLinks(raw);
  return { free, subscription, searchLinks: searchLinks(title) };
}

// TMDB provider names/logos: INFO ONLY. The only link is TMDB's own page.
export function buildTmdbProviders(tmdb) {
  const w = tmdb?.watchProviders;
  if (!w) return null;
  const names = {};
  for (const key of ["flatrate", "free", "ads"]) {
    names[key] = (w[key] || [])
      .filter((p) => p && p.name)
      .map((p) => ({ name: String(p.name), logo: httpsOrEmpty(p.logo) }));
  }
  const u = safeHttps(w.link);
  const link = u && u.hostname.toLowerCase() === "www.themoviedb.org" ? u.href : "";
  if (!link && !names.flatrate.length && !names.free.length && !names.ads.length) return null;
  return { link, names };
}

// Puts everything together. Each argument is the source's result or null.
export function buildExtras({ base, anilist, kitsu, mal, wikidata, wikipedia, tmdb }) {
  const reviews = mergeReviews({ mal, anilist: anilist?.reviews, kitsu: kitsu?.reviews });

  const background = wikipedia
    ? {
        extract: wikipedia.extract,
        url: wikipedia.url,
        title: wikipedia.title,
        license: wikipedia.license,
        attribution: wikipedia.attribution,
      }
    : null;

  // Credits: only sources that really gave us something.
  const credits = [];
  if (anilist || base?.source === "anilist") credits.push("AniList");
  if (base?.source === "jikan" || (mal && mal.length)) credits.push("Jikan");
  if (kitsu) credits.push("Kitsu");
  if (wikipedia) credits.push("Wikipedia");
  if (wikidata) credits.push("Wikidata");
  if (tmdb) credits.push("TMDB");

  const out = {
    reviews,
    reviewSummary: summarizeReviews(reviews),
    whereToWatch: buildWhereToWatch({ kitsu, anilist, title: base.titleEnglish || base.title }),
    tmdbProviders: buildTmdbProviders(tmdb),
    background,
    images: (tmdb?.images || []).map(httpsOrEmpty).filter(Boolean),
    banner: httpsOrEmpty(anilist?.banner),
    tags: (anilist?.tags || []).map((t) => ({ name: String(t.name), rank: Number(t.rank) || 0 })),
    externalIds: {
      anilist: anilist?.anilistId ?? wikidata?.anilistId ?? null,
      kitsu: kitsu?.kitsuId ?? wikidata?.kitsuId ?? null,
      tmdb: tmdb?.tmdbId ?? null,
      wikidata: wikidata?.qid ?? null,
    },
    credits,
  };
  if (tmdb) {
    out.tmdbAttribution = { text: tmdb.attribution, logo: httpsOrEmpty(tmdb.logoUrl) };
  }
  return out;
}
