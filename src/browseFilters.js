// Pure helper functions for the Browse filters (no React in here, so they are easy to test).
// The filters live in the web address, e.g. /browse?q=naruto&genres=1,22&year=2020&page=2

export const SEASONS = ["winter", "spring", "summer", "fall"];
export const TYPES = ["tv", "movie", "ova", "special", "ona", "music"];
export const STATUSES = ["airing", "complete", "upcoming"];
// Age ratings. NOTE: no adult option on purpose.
export const RATINGS = [
  { value: "g", label: "Everyone" },
  { value: "pg", label: "Kids" },
  { value: "pg13", label: "Teens 13+" },
  { value: "r17", label: "17+" },
];
export const SORTS = [
  { value: "score", label: "Score" },
  { value: "popularity", label: "Popularity" },
  { value: "title", label: "Title" },
  { value: "rank", label: "Rank" },
  { value: "start_date", label: "Start date" },
];
export const MAX_GENRES = 5; // the server accepts at most 5 genre ids
export const MIN_YEAR = 1980;

// The years the dropdown offers: this year down to 1980.
export function yearOptions(now = new Date()) {
  const out = [];
  for (let y = now.getFullYear() + 1; y >= MIN_YEAR; y--) out.push(y);
  return out;
}

const oneOf = (list, v) => (list.includes(v) ? v : "");

// Reads the web address (URLSearchParams) and returns clean filters. Bad values are dropped.
export function parseFilters(params, now = new Date()) {
  const get = (k) => (params.get(k) || "").trim();
  const genres = [];
  for (const part of get("genres").split(",")) {
    if (/^\d{1,4}$/.test(part) && !genres.includes(part) && genres.length < MAX_GENRES) genres.push(part);
  }
  const yearNum = /^\d{4}$/.test(get("year")) ? Number(get("year")) : 0;
  const year = yearNum >= MIN_YEAR && yearNum <= now.getFullYear() + 1 ? String(yearNum) : "";
  const pageNum = /^\d{1,3}$/.test(get("page")) ? Number(get("page")) : 1;
  return {
    q: get("q").slice(0, 100),
    genres,
    year,
    season: oneOf(SEASONS, get("season").toLowerCase()),
    type: oneOf(TYPES, get("type").toLowerCase()),
    status: oneOf(STATUSES, get("status").toLowerCase()),
    rating: oneOf(RATINGS.map((r) => r.value), get("rating").toLowerCase()),
    order_by: oneOf(SORTS.map((s) => s.value), get("order_by").toLowerCase()),
    sort: oneOf(["asc", "desc"], get("sort").toLowerCase()),
    mood: get("mood").slice(0, 30),
    page: Math.min(50, Math.max(1, pageNum)),
  };
}

// Turns filters back into a query string for the address bar (empty values are left out).
export function buildQuery(filters) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.genres && filters.genres.length) p.set("genres", filters.genres.join(","));
  for (const key of ["year", "season", "type", "status", "rating", "order_by", "sort", "mood"]) {
    if (filters[key]) p.set(key, filters[key]);
  }
  if (filters.page && filters.page > 1) p.set("page", String(filters.page));
  return p.toString();
}

// How many filters are switched on (search text and page don't count). Used for the "Filters (2)" button.
export function countActive(filters) {
  let n = filters.genres.length;
  for (const key of ["year", "season", "type", "status", "rating", "order_by"]) if (filters[key]) n++;
  return n;
}

// Builds the params for /api/anime-list?kind=search.
export function toApiParams(filters, limit = 24) {
  const out = { kind: "search", page: String(filters.page || 1), limit: String(limit) };
  if (filters.q) out.q = filters.q;
  if (filters.genres.length) out.genres = filters.genres.join(",");
  for (const key of ["year", "season", "type", "status", "rating", "order_by"]) {
    if (filters[key]) out[key] = filters[key];
  }
  if (filters.order_by) {
    // Titles and ranks read best A->Z / 1->N; everything else biggest first.
    out.sort = filters.sort || (["title", "rank"].includes(filters.order_by) ? "asc" : "desc");
  }
  return out;
}

// Mood chips on the home page -> Jikan genre ids.
export const MOODS = [
  { label: "Cozy", genres: [36] },           // Slice of Life
  { label: "Action-packed", genres: [1] },   // Action
  { label: "Funny", genres: [4] },           // Comedy
  { label: "Romantic", genres: [22] },       // Romance
  { label: "Spooky", genres: [14] },         // Horror
  { label: "Mind-bending", genres: [7, 41] },// Mystery / Suspense
  { label: "Sporty", genres: [30] },         // Sports
];

// Link for a mood chip.
export function moodLink(mood) {
  const p = new URLSearchParams({ genres: mood.genres.join(","), mood: mood.label });
  return `/browse?${p.toString()}`;
}
