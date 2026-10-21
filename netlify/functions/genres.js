// The browser calls this function: /api/genres
// The list of anime genres (no adult ones). It is a fixed list, so no network is needed.
// Cached 7 days.

import { publicGenres } from "../shared/malGenres.js";
import { jsonResponse } from "../shared/cache.js";

const TTL = 60 * 60 * 24 * 7;

export default async () => jsonResponse({ genres: publicGenres(), credits: ["AniList"] }, TTL);

export const config = { path: "/api/genres" };
