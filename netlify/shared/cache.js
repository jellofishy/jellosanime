// A tiny memory cache so we don't call outside APIs on every page visit.
// It lives as long as the function stays "warm" on Netlify. We ALSO tell
// Netlify's CDN to cache responses (see jsonResponse), which does the heavy lifting.

const store = new Map();

// Returns the cached value, or runs `fetchFresh()` and remembers the result.
export async function cached(key, ttlSeconds, fetchFresh) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fetchFresh();
  store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  return value;
}

// Builds a JSON response that browsers and Netlify's CDN may cache.
export function jsonResponse(data, ttlSeconds = 3600, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=60`,
      "Netlify-CDN-Cache-Control": `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`,
    },
  });
}
