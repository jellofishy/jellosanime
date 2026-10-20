# jellosanime

jellosanime is a friendly anime discovery website for classic and currently airing anime. Search or browse, read about a show, watch the official trailer, see what fans think, and find **legal** places to watch it. Log in to keep your own **My List**.

jellosanime does not host, stream or embed episodes. It only links to legal services, and adult content is always filtered out.

## Tech

- **Front end**: React 18 + Vite, React Router
- **Back end**: Netlify Functions (small server programs in `netlify/functions`)
- **Login and My List**: Supabase (with Row Level Security so each person only sees their own list)
- **Data sources**: Jikan (MyAnimeList), AniList, Kitsu, Wikidata, Wikipedia, TMDB (optional)
- **Hosting**: Netlify

## Features

- Home rows: trending, airing today, top, popular and this season
- Search with filters (type, status, rating, genres, year, season, sort)
- Detail page: synopsis, "who it's for", YouTube trailer, gallery, tags, Wikipedia background
- Reviews from MyAnimeList, AniList and Kitsu
- "Where to watch": free and subscription legal services only (allowlist + piracy blocklist)
- Light and dark theme that remembers your choice
- Sign up, log in, and My List
- Security headers (CSP and more) in `public/_headers`

## Run it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer.

1. Download the code and open a terminal in the project folder.
2. Install the pieces it needs: `npm install`
3. Copy the settings template: `cp .env.example .env` (on Windows: `copy .env.example .env`)
4. Open `.env` and fill in the values:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (public; from Supabase, Project Settings, API Keys). Without them the site works, but login is turned off.
   - `TMDB_API_KEY` (secret, optional; extra pictures and provider names). Never put `VITE_` in front of it.
5. Start it: `npm run dev` (runs the site and the back-end functions together using Netlify Dev).
   Just want the front end? `npm run dev:vite`.
6. Open the address it prints (usually http://localhost:8888).

Other commands: `npm run build` (make the real site in `dist/`), `npm run preview` (look at that build).

## Folder map

| Folder or file | What it holds |
|---|---|
| `src/` | The website (React): `pages/`, `components/`, `auth/` (Supabase login), CSS |
| `netlify/functions/` | The `/api/...` endpoints the website calls |
| `netlify/adapters/` | One file per data source (Jikan, AniList, Kitsu, Wikidata, Wikipedia, TMDB) |
| `netlify/shared/` | Shared helpers: cache, rate limiter, legal-streaming allowlist, review/extras builder |
| `public/_headers` | Security headers for the live site |
| `netlify.toml` | Netlify build and redirect settings |
| `index.html` | Page shell (includes the tiny theme script) |
| `docs/` | Project documents (below) |
| `.env.example` | Template for your private settings (`.env` is never uploaded to GitHub) |

## Documents

- [Product requirements (PRD)](docs/PRD.md)
- [Agent plan](docs/AGENT_PLAN.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Data contracts](docs/CONTRACTS.md)
- [Security report](docs/SECURITY_REPORT.md)
- [QA report](docs/QA_REPORT.md)
- [Deploy guide (step by step, for beginners)](docs/DEPLOY.md)

## Credits and legal

- Anime information: [Jikan](https://jikan.moe) (MyAnimeList data), [AniList](https://anilist.co), [Kitsu](https://kitsu.app), [Wikidata](https://www.wikidata.org).
- Background text: [Wikipedia](https://www.wikipedia.org), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. TMDB data is for non-commercial use only.
- Trailers play through YouTube's privacy-enhanced player. All anime titles, images and trademarks belong to their owners.
- jellosanime is a school project. It does not host or stream any episodes and only links to legal services.
