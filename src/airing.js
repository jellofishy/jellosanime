// Small helpers for the "Airing Today" row (pure functions, easy to test).

// Formats unix seconds as the VISITOR'S local time, e.g. "7:30 PM".
export function formatAirTime(airingAt, locale) {
  if (typeof airingAt !== "number" || !isFinite(airingAt)) return "";
  return new Date(airingAt * 1000).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

// True when the episode's air time is already in the past.
export function hasAired(airingAt, nowMs = Date.now()) {
  return typeof airingAt === "number" && airingAt * 1000 < nowMs;
}

// Returns a NEW array sorted by air time (earliest first); items without a time go last.
export function sortByAirTime(items) {
  const time = (a) => (typeof a.airingAt === "number" ? a.airingAt : Infinity);
  return [...(items || [])].sort((a, b) => time(a) - time(b));
}

// ---------- Weekly schedule (the /airing page) ----------

// Local calendar day as "YYYY-MM-DD" (uses the VISITOR'S time zone, because Date getters do).
function dayKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Groups airing items by the visitor's local day.
// Returns an array of days, starting with today: [{ key, label, sub, items }]
//   label = "Today", "Tomorrow", then weekday names ("Wed")   sub = the date number ("12")
// There are always at least 7 days; an 8th appears only if an item lands on it
// (the server sends "the next 7 days from now", which can touch 8 calendar days).
// Items inside a day are sorted by time. Items from before today are dropped.
export function groupByLocalDay(items, nowMs = Date.now(), locale) {
  const now = new Date(nowMs);
  const list = sortByAirTime((items || []).filter((a) => a && typeof a.airingAt === "number" && isFinite(a.airingAt)));
  const buckets = new Map();
  for (const a of list) {
    const k = dayKey(new Date(a.airingAt * 1000));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(a);
  }
  const days = [];
  for (let i = 0; i < 8; i++) {
    // new Date(y, m, d + i) is local midnight and copes with month ends and daylight saving.
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(d);
    const dayItems = buckets.get(key) || [];
    if (i === 7 && dayItems.length === 0) break; // the 8th day only shows up when needed
    days.push({
      key,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(locale, { weekday: "short" }),
      sub: String(d.getDate()),
      items: dayItems,
    });
  }
  return days;
}
