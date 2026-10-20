// Tiny safety helpers. Anything that comes from an API is checked here
// before it becomes a link or an image, so a bad value (like "javascript:...")
// can never be clicked or loaded.

// True only for text that starts with https://
export function isHttps(url) {
  return typeof url === "string" && url.startsWith("https://");
}

// Returns the url if it is https and starts with `prefix` (when given), else "".
export function safeUrl(url, prefix = "https://") {
  return isHttps(url) && url.startsWith(prefix) ? url : "";
}

// Makes a plain array out of anything.
export const asArray = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
