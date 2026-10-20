# Shared contracts (every agent builds to these so the pieces fit)

All adapters are ES modules in `netlify/adapters/`, plain JavaScript, simple comments.
Rules for every adapter: never throw to the caller for "no data" (return `null` / `[]`); throw a
normal Error only for real failures; respect the source's rate limits (use `createLimiter` from
`netlify/shared/rateLimiter.js` where a source needs it); adult content is never returned;
use `fetch` with a timeout (AbortController, ~8s); keys come from `process.env` only.
Docs-check: try to read the CURRENT official docs (WebSearch or Firecrawl tools if available);
if the network blocks you, write from your best knowledge and list exactly what is UNVERIFIED.

## Review (all review sources return this)
```
{ source: "mal" | "anilist" | "kitsu", author: string, score: number|null /* 0-10 */,
  recommended: true | false | null, excerpt: string /* max 300 chars, ends with "…" if cut */,
  url: string /* link to the ORIGINAL review */, date: string /* ISO or "" */ }
```
Never return a whole review: cut the text to 300 chars. Strip HTML/markdown/spoiler tags.

## Raw stream link (adapters return these; the Back-end allowlist classifies them)
```
{ url: string, label: string /* site name if the source gave one */, source: "kitsu"|"anilist"|"tmdb" }
```

## Airing item (AniList)
```
{ malId: number, title, titleEnglish, image, banner, genres: [], episode: number,
  airingAt: number /* unix seconds of that episode */, score: number|null /* 0-10 */, format: string }
```

## ID matching
MyAnimeList ID (malId) is the master key. Kitsu: `/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=<malId>&include=item`.
AniList: query `Media(idMal: <malId>, type: ANIME)`. Wikidata: property P4086 = MAL anime id, P8729 = AniList anime id, P4082 = Kitsu id.

## Legal streaming (Back-end owns)
`netlify/shared/streamingSites.js` exports `classifyLink(url)` -> `{ service, kind: "free"|"subscription" } | null`
(null = not on the allowlist, so the link is DROPPED) and `searchLinks(title)` -> fallback search links on free services.
Allowlist domains only: free = tubi.tv, pluto.tv, retrocrush.tv, plex.tv, therokuchannel.roku.com / roku.com, youtube.com (official channels only); subscription = crunchyroll.com, netflix.com, hulu.com, hidive.com, disneyplus.com, max.com, primevideo.com, amazon.com/prime, funimation (redirects to crunchyroll), vrv, apple tv.
NEVER any piracy site.

## API endpoints (Back-end builds; Front-end consumes)
- `GET /api/airing-today` -> `{ results: AiringItem[], credits: ["AniList"] }`
- `GET /api/trending` -> `{ results: Anime[] /* shared shape */, credits: ["AniList"] }`
- `GET /api/genres` -> `{ genres: [{id, name}] }`
- `GET /api/anime-extras?id=<malId>` -> `{ reviews: Review[], reviewSummary: {...}, whereToWatch: { free: Link[], subscription: Link[], searchLinks: Link[] }, background: { extract, url, title } | null, images: [], banner: string, tags: [{name, rank}], externalIds: {anilist, kitsu, tmdb, wikidata}, credits: [ "AniList","Kitsu","Wikipedia","Wikidata","TMDB","Jikan" ] }`
  where `Link = { service, url, kind }`. Every section fails alone (empty array / null), never the whole response.
