// Picks which title to show for an anime, based on the visitor's language choice.
// lang: "english" | "romanized" | "native"
export const TITLE_LANGS = [
  { key: "english", label: "English" },
  { key: "romanized", label: "Romanized" },
  { key: "native", label: "Native" },
];

export function displayTitle(anime, lang) {
  if (!anime) return "";
  if (lang === "romanized") return anime.title || "";
  if (lang === "native") return anime.titleNative || anime.titleJapanese || anime.title || "";
  // "english" (the default)
  return anime.titleEnglish || anime.title || "";
}
