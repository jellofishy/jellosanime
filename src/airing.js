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
