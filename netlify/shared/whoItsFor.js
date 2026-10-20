// Turns an anime's age rating + genres into a friendly "who is this for?" blurb.
// Pure function: no network, no side effects. Safe to call from anywhere.

// Short phrase for each genre ("who enjoys ___"). Unknown genres fall back to lowercase name.
const GENRE_WORDS = {
  "Action": "action",
  "Adventure": "adventure",
  "Comedy": "comedy",
  "Drama": "drama",
  "Fantasy": "fantasy",
  "Horror": "horror",
  "Romance": "romance",
  "Sci-Fi": "science fiction",
  "Slice of Life": "relaxed everyday stories",
  "Sports": "sports",
  "Mystery": "mystery",
  "Supernatural": "the supernatural",
  "Suspense": "suspense",
  "Ecchi": "cheeky humor",
  "Award Winning": "acclaimed stories",
};

// What to "expect" for each genre. Only the first one that matches is used.
const GENRE_EXPECT = {
  "Action": "fast fights",
  "Adventure": "a big adventure",
  "Comedy": "plenty of laughs",
  "Drama": "strong emotions",
  "Fantasy": "magical worlds",
  "Horror": "scary moments",
  "Romance": "sweet relationships",
  "Sci-Fi": "futuristic ideas",
  "Slice of Life": "a calm, cozy pace",
  "Sports": "intense matches",
  "Mystery": "twists and clues",
  "Supernatural": "strange powers",
  "Suspense": "tense moments",
};

// Who the show is aimed at, by demographic tag.
const DEMOGRAPHIC_WORDS = {
  "Shounen": "It is aimed at younger fans of action-style stories.",
  "Shoujo": "It is aimed at younger fans of heartfelt stories.",
  "Seinen": "It is aimed at adult viewers.",
  "Josei": "It is aimed at adult viewers who like grown-up relationships.",
  "Kids": "It is made with young kids in mind.",
};

// Works out the friendly label + level from the raw rating text Jikan gives us.
function readRating(rating) {
  const r = String(rating || "").trim();
  if (!r) return { ageLabel: "Age rating not listed", ageLevel: "unknown" };
  // Check the longer codes first (PG-13 before PG, R+ before R).
  if (r.startsWith("G ")) return { ageLabel: "Everyone", ageLevel: "everyone" };
  if (r.startsWith("PG-13")) return { ageLabel: "Teens 13+", ageLevel: "teens" };
  if (r.startsWith("PG")) return { ageLabel: "Kids", ageLevel: "kids" };
  if (r.startsWith("Rx")) return { ageLabel: "Age rating not listed", ageLevel: "unknown" }; // adult: never shown
  if (r.startsWith("R+")) return { ageLabel: "Mature (17+, mild nudity)", ageLevel: "mature" };
  if (r.startsWith("R")) return { ageLabel: "Ages 17+", ageLevel: "mature" };
  return { ageLabel: "Age rating not listed", ageLevel: "unknown" };
}

// "action", "action and fantasy", "action, fantasy and comedy"
function joinWords(words) {
  if (words.length <= 1) return words.join("");
  return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
}

// Opening phrase for each age level.
const AUDIENCE = {
  everyone: "A good pick for viewers of any age",
  kids: "A good pick for kids and families alike",
  teens: "A good pick for teens and up",
  mature: "Best for older teens and adults",
  unknown: "A good pick for anime fans",
};

export function whoItsFor(anime) {
  const a = anime || {};
  const { ageLabel, ageLevel } = readRating(a.rating);

  // Take up to 3 genres, then top up with themes if we have fewer than 2.
  const genres = Array.isArray(a.genres) ? a.genres : [];
  const themes = Array.isArray(a.themes) ? a.themes : [];
  const tags = [...genres.slice(0, 3)];
  for (const t of themes) {
    if (tags.length >= 2) break;
    tags.push(t);
  }

  // Sentence 1: who it is for, and what they enjoy.
  const likes = tags.map((g) => GENRE_WORDS[g] || String(g).toLowerCase());
  let first = AUDIENCE[ageLevel];
  if (likes.length) first += ` who enjoy ${joinWords(likes)}`;
  first += ".";

  // Sentence 2: what to expect (from the first genre we recognise)...
  const expectKey = tags.find((g) => GENRE_EXPECT[g]);
  const demographics = Array.isArray(a.demographics) ? a.demographics : [];
  const demoKey = demographics.find((d) => DEMOGRAPHIC_WORDS[d]);
  let second = "";
  if (expectKey) {
    // Use a second expectation too if there is one, e.g. "fast fights and a big adventure".
    const expects = tags.filter((g) => GENRE_EXPECT[g]).slice(0, 2).map((g) => GENRE_EXPECT[g]);
    second = `Expect ${joinWords(expects)}.`;
  } else if (demoKey) {
    // ...otherwise fall back to the demographic line.
    second = DEMOGRAPHIC_WORDS[demoKey];
  }

  const summary = second ? `${first} ${second}` : first;
  return { ageLabel, ageLevel, summary };
}
