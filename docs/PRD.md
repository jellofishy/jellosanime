# jellosanime: Product Requirements Document (PRD)

**Owner:** jellofishy  |  **Version:** 1.0  |  **Status:** Draft, waiting for owner approval

## 1. What is jellosanime?
jellosanime is an anime information hub. A visitor can look up ANY anime (old classics,
new releases, shows airing today) and learn everything they need before deciding to watch it:
what it's about, who it's for, what real fans think, and where to watch it **legally**.

The site **does not host, stream, or embed episodes.** It only links out to legal streaming services.

## 2. Goals
1. Make it easy to find any anime and understand it in about a minute.
2. Combine several free data sources into one clean page per anime.
3. Point people to legal places to watch (free first, then subscription).
4. Be fast, mobile friendly, and dark-mode by default.

**Not goals (for now):** user accounts, our own comments, a database (that is Phase 2).

## 3. Who is it for?
- **Newcomers** who don't know what to watch and want a quick "is this for me?" answer.
- **Fans** who want reviews, trailers, and what's airing today.
- **Parents/younger viewers** who want to see the age rating before watching.

## 4. Features (what the site must do)

| # | Feature | Details |
|---|---------|---------|
| F1 | Search | Search bar on every page; finds any anime by name. |
| F2 | Home page | Rows: Airing Today, Top Anime, This Season, Trending. |
| F3 | Browse | Filter by genre, year, season, type (TV/movie), status, age rating. |
| F4 | Detail page | Title, cover/banner, synopsis, genres, tags, episodes, studio, score, year. |
| F5 | Who it's for | Age rating + genres/tags + a short plain-English summary. |
| F6 | Trailer | Embedded official YouTube trailer when one exists. |
| F7 | Background | Short Wikipedia summary, with credit and a link to the article. |
| F8 | What fans think | Reviews from MyAnimeList (Jikan), AniList, Kitsu: score, recommended or not, a short excerpt, and a "Read full review" link. Never copy whole reviews. |
| F9 | Discuss on Reddit | A plain link to a Reddit search for the show. No Reddit API. |
| F10 | Where to watch | Two rows: **Free** (Tubi, Pluto TV, RetroCrush, Plex, Roku Channel, official YouTube) and **Subscription** (Crunchyroll, Netflix, Hulu, HIDIVE...). If nothing is known, say so and link to searches on the free services. |
| F11 | Credits | Every data source is credited in the footer and next to its data. |

## 5. Data sources
The **MyAnimeList ID** is the master key that links all sources together.

| Source | Used for | Key needed? |
|--------|----------|-------------|
| Jikan v4 | Main catalog, trailers, MAL reviews | No (limit 3/sec, 60/min) |
| AniList GraphQL | Airing schedule, banners, tags, reviews, streaming links | No |
| Kitsu | Streaming links, reviews, ID mappings | No |
| Wikipedia REST | Background summary | No |
| Wikidata | Facts, matching MAL/AniList IDs | No |
| TMDB | Extra images, where-to-watch providers | **Yes** (secret) |

## 6. Rules (non-negotiable)
- **Legal links only.** Only allowed streaming sites (an allowlist). Never link to piracy sites (9anime, Gogoanime, HiAnime, AniWatch or similar). Never scrape or embed episode video.
- **No adult content.** Use `sfw=true` on Jikan and equivalent filters elsewhere.
- **Respect rate limits.** Cache results; never call an API on every page visit.
- **Secrets stay secret.** API keys live only in Netlify environment variables and are used only inside Netlify Functions, never in browser code.
- **Credit sources.** Follow each source's attribution rules (Wikipedia credit and link, TMDB notice and logo).
- **Short excerpts only** for reviews, with a link to the original.

## 7. Technical approach
- **Front end:** React + Vite.
- **Back end:** Netlify Functions that call the APIs, clean the data, and cache it.
- **Adapters:** one small module per data source, each turning that source's data into the **one shared anime format** (`netlify/shared/animeShape.js`). This shared format is the "contract" that lets agents work in parallel.
- **Hosting:** Netlify (auto-deploys from GitHub).
- **Phase 2 (later):** Supabase database refreshed daily, plus our own comment section.

## 8. Success criteria (how we know it works)
- Each page loads in under about 3 seconds on a normal connection.
- Works on phone-width screens with no sideways scrolling.
- Zero API keys appear in the browser code or the GitHub repo.
- Zero piracy links anywhere.
- No adult titles show up in search, browse, or home rows.
- Every milestone's acceptance checklist (in section 9) passes.

## 9. Milestones and acceptance checklists

| Milestone | What gets built | Done when... | Status |
|-----------|-----------------|--------------|--------|
| **M0** Setup | Project, Netlify config, shared format, cache, rate limiter | `npm run build` works | Done |
| **M1** Catalog | Jikan adapter, search, Top Anime, home rows, Browse page | Search and rows show real anime; SFW only | Done (needs live test) |
| **M2** Detail page | `/anime/:id` page, trailer, "Who it's for" | Every field shows; missing data does not crash the page | Next |
| **M3** Airing Today | AniList adapter, exact air times, banners, Trending | "Airing Today" shows correct times | Planned |
| **M4** Reviews | MAL, AniList, Kitsu reviews, Reddit link | Excerpts plus links to originals; failures handled | Planned |
| **M5** Where to watch | Kitsu and TMDB providers, allowlist, Free/Subscription rows | Only allowlisted links; fallback search links work | Planned |
| **M6** Extras | Wikipedia, Wikidata, TMDB images, credits | Wikipedia credit and link shown; TMDB notice shown | Planned |
| **M7** Browse filters | Genre, year, season, type, status, rating filters | Filters combine correctly | Planned |
| **M8** Review and deploy | Full QA, security and piracy audit, Netlify deploy | Audit report is clean; site is live | Planned |

## 10. Risks
| Risk | Plan |
|------|------|
| An API is down or slow | Each page section fails alone with a friendly message; cached data is served. |
| Rate limits hit | Request queue and caching; Jikan calls spaced out. |
| API docs change | Each adapter agent reads the CURRENT docs before coding. |
| Wrong ID matches between sources | Match on MAL ID first, then confirm with Wikidata and Kitsu mappings. |
| Piracy link sneaks in | Allowlist of domains plus an automated check. |
