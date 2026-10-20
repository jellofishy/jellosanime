// The legal-only gatekeeper for "where to watch".
// Only links to the services on the allowlist below ever reach the website.
// Anything else (and any known piracy site) is dropped. Pure functions, no network.

// Allowlist: each entry = a service name, whether it is free, and the domains it owns.
// A link matches only if its HOSTNAME is exactly the domain or a true subdomain of it.
const SERVICES = [
  // ---- free ----
  { service: "Tubi", kind: "free", domains: ["tubitv.com", "tubi.tv"] },
  { service: "Pluto TV", kind: "free", domains: ["pluto.tv"] },
  { service: "RetroCrush", kind: "free", domains: ["retrocrush.tv"] },
  { service: "Plex", kind: "free", domains: ["watch.plex.tv", "plex.tv"] },
  { service: "The Roku Channel", kind: "free", domains: ["therokuchannel.roku.com", "roku.com"] },
  { service: "YouTube", kind: "free", domains: ["youtube.com", "youtu.be"] },
  // ---- subscription ----
  { service: "Crunchyroll", kind: "subscription", domains: ["crunchyroll.com", "funimation.com", "vrv.co"] },
  { service: "Netflix", kind: "subscription", domains: ["netflix.com"] },
  { service: "Hulu", kind: "subscription", domains: ["hulu.com"] },
  { service: "HIDIVE", kind: "subscription", domains: ["hidive.com"] },
  { service: "Disney+", kind: "subscription", domains: ["disneyplus.com"] },
  { service: "Max", kind: "subscription", domains: ["max.com", "hbomax.com"] },
  { service: "Prime Video", kind: "subscription", domains: ["primevideo.com"] },
  { service: "Apple TV", kind: "subscription", domains: ["tv.apple.com"] },
];

// amazon.com sells everything, so it only counts for video pages.
const AMAZON_VIDEO_PATHS = ["/gp/video", "/dp/"];

// Second safety net: known piracy keywords. If a host contains one, it is NEVER allowed.
export const BLOCKLIST = [
  "9anime", "gogoanime", "gogoanimes", "hianime", "aniwatch", "zoro", "animixplay",
  "kissanime", "animepahe", "4anime", "animeflv", "animekisa", "anitaku", "animesuge",
  "animeheaven", "animedao", "animeland", "animeout", "animefrenzy", "chia-anime",
  "masteranime", "animeultima", "putlocker", "123movies", "fmovies", "soap2day",
  "anilist-piracy", "kaido", "aniwave", "anix.to", "wcostream", "wcofun",
];

// True if the host is exactly `domain` or a real subdomain of it.
function hostMatches(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

// Turns a string into a URL object, or null if it is not a valid absolute URL.
function parse(url) {
  if (typeof url !== "string") return null;
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

// Lowercase host without a trailing dot ("Crunchyroll.com." -> "crunchyroll.com").
function cleanHost(u) {
  return u.hostname.toLowerCase().replace(/\.$/, "");
}

// True if the URL's host looks like a known piracy site.
export function isPiracy(url) {
  const u = parse(url);
  const host = u ? cleanHost(u) : String(url || "").toLowerCase(); // unparseable: check raw text
  return BLOCKLIST.some((word) => host.includes(word));
}

// Returns { service, kind, url } if the link is on the allowlist, otherwise null (= drop it).
export function classifyLink(url) {
  const u = parse(url);
  if (!u) return null;
  if (u.protocol !== "https:") return null;        // https only (no http, javascript:, data:)
  if (u.username || u.password) return null;       // "https://crunchyroll.com@evil.com/" trick
  if (u.port) return null;                         // no odd ports
  if (isPiracy(url)) return null;                  // safety net, checked before the allowlist

  const host = cleanHost(u);

  // Amazon: only video pages count as Prime Video.
  if (hostMatches(host, "amazon.com")) {
    const path = u.pathname.toLowerCase();
    if (AMAZON_VIDEO_PATHS.some((p) => path.startsWith(p))) {
      return { service: "Prime Video", kind: "subscription", url: u.href };
    }
    return null;
  }

  for (const s of SERVICES) {
    if (s.domains.some((d) => hostMatches(host, d))) {
      return { service: s.service, kind: s.kind, url: u.href };
    }
  }
  return null;
}

// Takes raw links (objects with a `url`) and returns { free: [], subscription: [] }.
// Drops anything not allowed, keeps the first link per service, sorts by service name.
export function splitLinks(rawLinks) {
  const result = { free: [], subscription: [] };
  if (!Array.isArray(rawLinks)) return result;
  const seen = new Set();
  for (const raw of rawLinks) {
    const url = typeof raw === "string" ? raw : raw && raw.url;
    const link = classifyLink(url);
    if (!link || seen.has(link.service)) continue;
    seen.add(link.service);
    result[link.kind].push({ service: link.service, url: link.url, kind: link.kind });
  }
  const byName = (a, b) => a.service.localeCompare(b.service);
  result.free.sort(byName);
  result.subscription.sort(byName);
  return result;
}

// Fallback "search for it yourself" links, built only from the encoded title.
// UNVERIFIED: the exact search URL patterns of Pluto TV, RetroCrush, Plex and Roku.
export function searchLinks(title) {
  const q = encodeURIComponent(String(title || "").trim());
  if (!q) return [];
  const links = [
    { service: "Tubi", url: `https://tubitv.com/search/${q}`, kind: "free" },
    { service: "Pluto TV", url: `https://pluto.tv/en/search/details?q=${q}`, kind: "free" },
    { service: "RetroCrush", url: `https://www.retrocrush.tv/search?q=${q}`, kind: "free" },
    { service: "Plex", url: `https://watch.plex.tv/search?q=${q}`, kind: "free" },
    { service: "The Roku Channel", url: `https://therokuchannel.roku.com/search/${q}`, kind: "free" },
    { service: "YouTube", url: `https://www.youtube.com/results?search_query=${q}+anime+official`, kind: "free" },
    { service: "Crunchyroll", url: `https://www.crunchyroll.com/search?q=${q}`, kind: "subscription" },
  ];
  // Only keep links that also pass the gatekeeper.
  return links.filter((l) => classifyLink(l.url) !== null);
}
