// Static genre list: MyAnimeList genre id -> the matching AniList genre name.
// The website keeps using MAL ids (so old links still work); AniList needs its own names.
// No adult genres are listed. Ecchi is left out on purpose (family-friendly site).
// Mahou Shoujo is left out because we are not sure of its MAL id.
export const MAL_GENRES = [
  { id: 1, name: "Action", anilist: "Action" },
  { id: 2, name: "Adventure", anilist: "Adventure" },
  { id: 4, name: "Comedy", anilist: "Comedy" },
  { id: 7, name: "Mystery", anilist: "Mystery" },
  { id: 8, name: "Drama", anilist: "Drama" },
  { id: 10, name: "Fantasy", anilist: "Fantasy" },
  { id: 14, name: "Horror", anilist: "Horror" },
  { id: 18, name: "Mecha", anilist: "Mecha" },
  { id: 19, name: "Music", anilist: "Music" },
  { id: 22, name: "Romance", anilist: "Romance" },
  { id: 24, name: "Sci-Fi", anilist: "Sci-Fi" },
  { id: 30, name: "Sports", anilist: "Sports" },
  { id: 36, name: "Slice of Life", anilist: "Slice of Life" },
  { id: 37, name: "Supernatural", anilist: "Supernatural" },
  { id: 40, name: "Psychological", anilist: "Psychological" },
  { id: 41, name: "Suspense", anilist: "Thriller" },
];

// The public list the /api/genres endpoint returns.
export const publicGenres = () => MAL_GENRES.map(({ id, name }) => ({ id, name }));

// "1,22" -> ["Action", "Romance"]. Unknown ids are ignored; duplicates removed.
export function genreIdsToAniList(idsCsv) {
  const names = [];
  for (const part of String(idsCsv || "").split(",")) {
    const g = MAL_GENRES.find((x) => x.id === Number(part.trim()));
    if (g && !names.includes(g.anilist)) names.push(g.anilist);
  }
  return names;
}
