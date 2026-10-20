// Offline tests for streamingSites.js. Run: node netlify/shared/streamingSites.test.mjs
import { classifyLink, isPiracy, splitLinks, searchLinks, BLOCKLIST } from "./streamingSites.js";

let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) passed++; else { failed++; console.log("FAIL:", name); }
}
const svc = (u) => (classifyLink(u) || {}).service || null;

// ---- allowed ----
const allowed = [
  ["https://www.crunchyroll.com/series/abc", "Crunchyroll", "subscription"],
  ["https://crunchyroll.com/", "Crunchyroll", "subscription"],
  ["https://WWW.CRUNCHYROLL.COM/x", "Crunchyroll", "subscription"],
  ["https://www.funimation.com/shows/x", "Crunchyroll", "subscription"],
  ["https://tubitv.com/series/1", "Tubi", "free"],
  ["https://tubi.tv/x", "Tubi", "free"],
  ["https://pluto.tv/en/on-demand", "Pluto TV", "free"],
  ["https://www.retrocrush.tv/x", "RetroCrush", "free"],
  ["https://watch.plex.tv/show/x", "Plex", "free"],
  ["https://therokuchannel.roku.com/details/x", "The Roku Channel", "free"],
  ["https://www.youtube.com/watch?v=1", "YouTube", "free"],
  ["https://youtu.be/abc", "YouTube", "free"],
  ["https://www.netflix.com/title/1", "Netflix", "subscription"],
  ["https://www.hulu.com/series/x", "Hulu", "subscription"],
  ["https://www.hidive.com/x", "HIDIVE", "subscription"],
  ["https://www.disneyplus.com/x", "Disney+", "subscription"],
  ["https://www.max.com/x", "Max", "subscription"],
  ["https://www.hbomax.com/x", "Max", "subscription"],
  ["https://www.primevideo.com/detail/x", "Prime Video", "subscription"],
  ["https://www.amazon.com/gp/video/detail/x", "Prime Video", "subscription"],
  ["https://www.amazon.com/dp/B000", "Prime Video", "subscription"],
  ["https://tv.apple.com/show/x", "Apple TV", "subscription"],
];
for (const [u, s, k] of allowed) {
  const r = classifyLink(u);
  check("allow " + u, r && r.service === s && r.kind === k && r.url.startsWith("https://"));
}

// ---- rejected ----
const rejected = [
  "https://crunchyroll.com.evil.com/",
  "https://evil.com/crunchyroll.com",
  "https://evil.com/?u=https://crunchyroll.com",
  "evil.com/?u=https://crunchyroll.com",
  "https://notcrunchyroll.com/",
  "https://evilnetflix.com/",
  "http://www.crunchyroll.com/",
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "ftp://tubitv.com/x",
  "https://9anime.to/x",
  "https://gogoanime.cl/x",
  "https://hianime.to/x",
  "https://aniwatch.to/x",
  "https://zoro.to/x",
  "https://animixplay.to/x",
  "https://kissanime.ru/x",
  "https://animepahe.ru/x",
  "https://4anime.gg/x",
  "https://9anime.crunchyroll.com.evil.com/",
  "https://crunchyroll.com@evil.com/",
  "https://user:pw@crunchyroll.com/",
  "https://crunchyroll.com:8443/",
  "https://www.amazon.com/Some-Product/b/123",
  "https://www.amazon.com/",
  "https://example.com/",
  "",
  "not a url",
  null,
  undefined,
  42,
];
for (const u of rejected) check("reject " + String(u), classifyLink(u) === null);

// ---- piracy safety net ----
for (const w of BLOCKLIST) check("blocklist word " + w, isPiracy(`https://www.${w}.example/x`));
check("isPiracy false for crunchyroll", !isPiracy("https://www.crunchyroll.com/"));
// Even a piracy-looking subdomain of an allowed service is refused.
check("piracy subdomain of allowed", classifyLink("https://9anime.youtube.com/") === null);

// ---- splitLinks ----
const split = splitLinks([
  { url: "https://www.netflix.com/title/1" },
  { url: "https://tubitv.com/series/1" },
  { url: "https://tubitv.com/series/2" },         // duplicate service, dropped
  { url: "https://9anime.to/x" },                  // piracy, dropped
  { url: "http://pluto.tv/x" },                    // http, dropped
  { url: "https://www.crunchyroll.com/a" },
  { url: "https://www.funimation.com/b" },         // also Crunchyroll, dropped
  { url: "https://www.youtube.com/watch?v=1" },
  null,
  {},
  "https://www.hulu.com/x",
]);
check("split free names", JSON.stringify(split.free.map((l) => l.service)) === '["Tubi","YouTube"]');
check("split sub names", JSON.stringify(split.subscription.map((l) => l.service)) === '["Crunchyroll","Hulu","Netflix"]');
check("split keeps first dup", split.free[0].url === "https://tubitv.com/series/1");
check("split crunchyroll first", split.subscription[0].url === "https://www.crunchyroll.com/a");
check("split link shape", Object.keys(split.free[0]).sort().join() === "kind,service,url");
check("split non-array", JSON.stringify(splitLinks(undefined)) === '{"free":[],"subscription":[]}');

// ---- searchLinks ----
const titles = ["Naruto", "Attack on Titan: Final Season", "Re:Zero & more/stuff?", "Ünï \"quote\" #1", "../evil.com"];
for (const t of titles) {
  const links = searchLinks(t);
  check("search count " + t, links.length === 7);
  for (const l of links) {
    const c = classifyLink(l.url);
    check(`search passes ${l.service} (${t})`, c && c.service === l.service && c.kind === l.kind);
    check(`search encoded (${t})`, !l.url.includes(" ") && !l.url.includes('"'));
  }
}
check("search empty title", searchLinks("").length === 0 && searchLinks(null).length === 0);
check("search has Crunchyroll sub", searchLinks("x").some((l) => l.service === "Crunchyroll" && l.kind === "subscription"));
check("search free count", searchLinks("x").filter((l) => l.kind === "free").length === 6);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
