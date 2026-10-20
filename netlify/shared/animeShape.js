// The ONE format every data source gets cleaned into.
// Whatever API the data comes from, the website only ever sees this shape.
// The MyAnimeList ID (malId) is the master key that links all sources together.

export function emptyAnime() {
  return {
    malId: null,          // number - master key
    title: "",
    titleEnglish: "",
    image: "",            // cover image URL
    banner: "",           // wide banner image URL (AniList, later)
    synopsis: "",
    genres: [],           // ["Action", "Comedy"]
    type: "",             // "TV", "Movie", ...
    episodes: null,
    status: "",           // "Currently Airing", "Finished Airing", ...
    score: null,          // 0-10
    year: null,
    season: "",           // "spring", "summer", ...
    rating: "",           // age rating, e.g. "PG-13 - Teens 13 or older"
    studios: [],
    trailerYoutubeId: "", // for the embedded trailer
    source: "jikan",      // which API this object came from (for credits)
  };
}
