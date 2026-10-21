// A tiny memory cache so we don't call outside APIs on every page visit.
// It lives as long as the function stays "warm" on Netlify. We ALSO tell
// Netlify's CDN to cache responses (see jsonResponse), which does the heavy lifting.

const MAX_ENTRIES = 500;       // never remember more than this many answers
const store = new Map();       // key -> { value, expires }
const inFlight = new Map();    // key -> promise of a fetch that is still running

// Makes room: first drops expired entries, then the oldest ones.
function makeRoom() {
  if (store.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) if (v.expires <= now) store.delete(k);
  // A Map remembers insertion order, so the first key is the oldest.
  while (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
}

// Returns the cached value, or runs `fetchFresh()` and remembers the result.
// If the same key is already being fetched, everyone waits for that one fetch.
// Failures are NOT remembered (the error just passes to the caller).
export function cached(key, ttlSeconds, fetchFresh) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  if (hit) store.delete(key); // expired

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const value = await fetchFresh();
      makeRoom();
      store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
      return value;
    } finally {
      inFlight.delete(key); // success or failure, this fetch is over
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

// For tests: how many answers are remembered right now.
export const cacheSize = () => store.size;

// Builds a JSON response. Good answers may be cached by browsers and
// Netlify's CDN. Errors are never cached (except 404 "not found", which the
// CDN may remember for a short time, at most 1 hour).
export function jsonResponse(data, ttlSeconds = 3600, status = 200) {
  const headers = { "Content-Type": "application/json" };
  if (status >= 400) {
    headers["Cache-Control"] = "no-store";
    headers["Netlify-CDN-Cache-Control"] =
      status === 404 ? `public, max-age=${Math.min(ttlSeconds, 3600)}` : "no-store";
  } else {
    headers["Cache-Control"] = "public, max-age=60";
    headers["Netlify-CDN-Cache-Control"] = `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`;
    // Only these query parameters change the answer, so the CDN keeps one cached copy per
    // combination and ignores random extra parameters (stops visitors bypassing the cache).
    headers["Netlify-Vary"] = "query=kind|q|page|limit|type|status|rating|genres|start_date|end_date|year|season|order_by|sort|id";
  }
  return new Response(JSON.stringify(data), { status, headers });
}
