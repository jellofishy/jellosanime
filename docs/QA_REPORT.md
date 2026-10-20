# QA and Security Report: Milestone M2 (Anime Detail Page)

Reviewer: QA and Security Agent  |  Date: 2026-10-20  |  Scope: M2 (`/anime/:id`), plus the shared code it uses.
Method: read all the code, ran `npm run build`, and wrote throw-away test scripts with fake (mock) data.
I did not edit any source code. Test scripts live only in the scratchpad folder, not in the repo.

## Plain-English summary

The detail page is in good shape. It loads, it handles empty and missing data without crashing, it only
embeds a YouTube trailer (no piracy, no other video), it never uses raw HTML, and no secrets are in the code.
The build passes.

Results across the 9 checks: **PASS 5** (checks 1, 2, 4, 6, 9), **PARTIAL 4** (checks 3, 5, 7, 8: they work
in normal use but have the gaps listed), **FAIL 0**. Issues found:
**0 High, 5 Medium, 9 Low.**

What to fix first (in this order):
1. The list/search function (`anime-list.js`) accepts almost any input. A visitor could make it call
   Jikan thousands of times with made-up pages or filters, and could grow memory without limit. (Medium)
2. Adult-content blocking depends 100% on Jikan's `sfw=true` filter, with no second safety net for lists and
   search. (Medium)
3. The Jikan "slow down" limiter only works inside one running copy of the function and its waiting line
   has no limit. (Medium)
4. The header probably overflows sideways on a 360px phone. (Medium, unverified because I have no browser)
5. The My List database safety (Row Level Security) could not be checked, and the button code relies on it. (Medium)

What I could NOT verify (no network to the anime APIs, no browser, no access to the live Supabase database):
real Jikan answers, whether Jikan really applies `sfw` on the single-anime endpoint, how the page looks on a
phone, Netlify's real caching behaviour, and Supabase Row Level Security. Everything below marked
"mock" was tested with fake data only.

---

## Checklist results

### 1. M2 acceptance: every field shows, missing data never crashes: PASS (with Low notes)

How I tested: I bundled the real `Detail.jsx` and rendered it to HTML with `react-dom/server`, feeding it
fake anime objects (built through the real `cleanAnimeDetail` and `whoItsFor` functions).

| Test (mock data) | Result |
|---|---|
| Full data (all fields present) | Renders: title, Japanese title, score, type, episodes, status, season+year, aired, duration, studio, rank, genre/theme/demographic chips, synopsis, "Who it's for" (age badge + summary), trailer, Reddit link, MAL link, credits |
| Only `mal_id`, everything else missing | No crash. Shows "No synopsis available yet.", "Age rating unknown", "No official trailer available" |
| Every field `null` | No crash |
| Empty object `{}` | No crash |
| Hostile text (`<script>`, `javascript:` link, `<img onerror>`) | Shown as plain text, no script or javascript link in output |
| Raw Jikan 404 / `data: null` through `animeById` | Returns `null`, which becomes a friendly "couldn't find that anime" |

Where this is handled: `src/pages/Detail.jsx:11` (the `list()` helper), `:46-62` (facts only shown if they have a value),
`:102` (synopsis fallback), `:107` (age fallback), `:38-44` (loading, not-found and error states),
`netlify/adapters/jikan.js:34-53, 88-102` (every field has a default).

Findings:
- LOW: **Score of 0 prints a stray "0".** `Detail.jsx:81` uses `{anime.score && ...}`. In React, `0 && ...` shows the
  number 0. Confirmed with a mock (`score: 0` produced `<h1>X</h1>0`). Same bug at `AnimeCard.jsx:9`.
  Fix: use `{anime.score > 0 && ...}` (or `anime.score ? ... : null` is NOT enough, use `> 0`).
- LOW: **Some fetched fields are never shown:** `producers`, `popularity`, `members` (`jikan.js:97-100`) are collected but
  not displayed in `Detail.jsx`. The PRD's F4 list (title, cover, synopsis, genres, tags, episodes, studio, score, year)
  is fully covered, so M2 passes, but if "every field" means every field we fetch, add a "Producers"
  and "Popularity" row to the `facts` array (`Detail.jsx:53-62`), or stop fetching them.
- LOW: **Year only shows inside "Season"** (`Detail.jsx:50`). It works (year-only mock showed "1998"), but the label
  reads "Season: 1998". Cosmetic. Fix: add a separate "Year" fact, or rename the label to "Season / Year".
- LOW: **Genre and theme chips appear twice** (once under the facts, once inside "Who it's for", `Detail.jsx:94-98` and `109-113`).
  Also, if a genre and a theme share a name, React complains about duplicate `key`s (mock confirmed it still renders).
  Fix: show the chips once, and use `key={t + i}`.
- LOW: **Page can crash if the API ever sends the wrong data type** (e.g. `themes` as a list of objects instead of names,
  or `genres` as a plain string). My mock crashed with "Objects are not valid as a React child". This cannot happen today
  because the server always converts lists to name strings, so it is a "future-proofing" note only.
  Fix: wrap the page in a React error boundary so one bad section shows a friendly message instead of a blank page.
- LOW: **Opening `/anime/abc` shows "Couldn't load this anime right now"** instead of "not found" (the server answers 400,
  `Detail.jsx:28` only treats 404 as not found). Fix: treat 400 like 404.

### 2. Secrets: PASS

- Searched the repo (excluding `node_modules`, `dist`, `.git`, `.env`) for `service_role`, `sb_secret`, `secret`, `token`, `api_key`,
  long JWT-looking strings (`eyJ...`). Only hits: a warning comment (`src/auth/supabaseClient.js:4`), the empty
  `TMDB_API_KEY=` placeholder (`.env.example:9`), password form fields (`Login.jsx`), and PRD/plan text. No real secret values.
- `.gitignore` ignores `.env` and `.env.*` (but allows `.env.example`). `git ls-files | grep env` lists only `.env.example`, so
  `.env` is **not tracked**.
- `.env` holds only `VITE_SUPABASE_URL` and a key starting `sb_publishable_`, which is public by design (OK).
  No `service_role` or `sb_secret` string appears in the repo or in the built `dist/` folder.
- The TMDB key is not used anywhere yet; when it is, it must only be read in Netlify Functions (no `VITE_` prefix). The
  `.env.example` comment already says this.
- UNVERIFIED: I was told not to run git, so I could not check the git *history* for a secret that was committed and later
  removed. Before going live, run a history scan (for example GitHub secret scanning) once.

### 3. Rate limits: PARTIAL (works in normal use; abuse is possible)

What passes:
- Every Jikan call goes through one function, `jikanGet` (`jikan.js:14-32`), which wraps each `fetch` in the limiter
  (`:22`, limiter created at `:11`: 400ms apart, max 50 per minute). `topAnime`, `thisSeason`, `searchAnime` and `animeById` all use it.
  No other `fetch` to Jikan exists anywhere.
- `animeById` makes exactly one request (mock confirmed: 1 fetch call, `/anime/1/full?sfw=true`) (`jikan.js:105-118`).
- A 429 ("slow down") is retried at most 3 times, each retry also going through the limiter (`jikan.js:21-23`).
- Caching: functions reply with `Cache-Control: public, max-age=60` plus `Netlify-CDN-Cache-Control` of up to a day with
  stale-while-revalidate (`cache.js:22-23`), and also keep a memory cache (`cache.js:8-14`). Detail is cached 1 day, "not found" 1 hour,
  errors for 1 second at the CDN (`anime-detail.js:38,42`).

Problems:
- MEDIUM: **`anime-list.js` does not validate its inputs, so a visitor can force unlimited Jikan calls and unlimited memory use.**
  - `page` has no upper limit (`anime-list.js:12`): `?kind=top&page=1`, `page=2`, ... `page=99999999` each create a new cache key
    and a new Jikan call.
  - `limit` can be negative (`:13`: `Math.min(24, -5)` is `-5`; only 0 is replaced with 12). Unclear what Jikan does with it.
  - The search filters `genres, type, status, rating, start_date, end_date` accept any text of any length (`:31-33`), and the whole
    thing is used in the cache key (`:35`). Every different value is a new Jikan call plus a new cache entry.
  - `q` is limited to 100 characters (`:34`, good) but every unique search is still a new Jikan call.
  - The memory cache never deletes anything (`cache.js:5-14`: no size limit, expired entries are never removed), so unique
    requests slowly eat the function's memory.
  - Note: extra made-up URL parameters (like `&x=1`) are NOT passed on, which is good (only the 6 allowed filter names are copied).
  - Fix: (a) `page = Math.min(page, 20)` (or whatever the site really needs); (b) `limit = Math.min(24, Math.max(1, ...))`;
  (c) check each filter against an allowed list or pattern: `type` in `tv,movie,ova,special,ona,music`; `status` in `airing,complete,upcoming`;
  `genres` only digits and commas (max ~5 ids); `start_date`/`end_date` must match `^\d{4}(-\d{2}(-\d{2})?)?$`;
  (d) give `cached()` a maximum size (for example 500 entries, delete the oldest) and remove expired entries.
- MEDIUM: **The limiter is per running function copy, and its waiting line has no limit.** `rateLimiter.js:6-27` keeps its
  counters in memory. Netlify can run several copies of a function at once, and each has its own counter, so together they
  can exceed Jikan's real limit (60/min) and get the site's IP blocked. Also, if many requests arrive at once, each waits
  in line (400ms apart); the line can grow until requests time out. Likewise `cached()` has no "someone is already fetching
  this" protection, so 20 visitors asking for the same new page at once cause 20 Jikan calls (`cache.js:8-14`).
  Fix: (a) keep a small in-flight map in `cached()` (store the promise, not just the value) so simultaneous identical requests
  share one call; (b) if the limiter line is longer than about 10, immediately answer "busy, try later" (HTTP 503) instead of
  waiting; (c) for real safety, long term use a shared cache (Netlify Blobs or the planned Supabase table).
- LOW: **Detail ids are unbounded in count.** `anime-detail.js:16` accepts any 1-7 digit number (up to 9,999,999) but real MAL ids are
  around 60,000. A script could request many different ids, each a new Jikan call. The CDN cache helps only for repeats.
  Fix: after the limiter fixes above, optionally reject ids above 200000 (adjust over time).
- LOW: **Errors can be cached by browsers for 60 seconds.** `cache.js:22` always sends `Cache-Control: public, max-age=60`, even for
  the 502 error reply (the code comment at `anime-detail.js:41` says errors should not be remembered; the CDN header is 1 second,
  but the plain header still says 60). Fix: for status >= 400 send `Cache-Control: no-store` (or max-age=1).
- UNVERIFIED: Whether Netlify's CDN honours these headers exactly as written (needs a live deploy to test).

### 4. Piracy and legal: PASS

- Case-insensitive search for `9anime`, `gogoanime`, `hianime`, `aniwatch`, `zoro`, `kissanime`, `animepahe`, `anix`, `animixplay`:
  no matches in code (only the PRD's "never link to these" rule text). `crunchyroll` appears only in PRD/plan text, not in code.
- The only `<iframe>` in the project is the YouTube trailer (`src/components/Trailer.jsx:11-16`) pointing at
  `https://www.youtube-nocookie.com/embed/<id>`. No `<video>`, `<embed>`, or `<object>` exist anywhere in `src/` or `netlify/`.
- All external addresses in the code: `api.jikan.moe`, `docs.api.jikan.moe` (comment), `jikan.moe`, `myanimelist.net`,
  `reddit.com/search`, `youtube-nocookie.com/embed`. All fine.
- The footer says the site does not host or stream episodes (`Footer.jsx:8-9`).
- LOW (hardening): The trailer iframe has no `referrerPolicy` or `allow` attribute (`Trailer.jsx:11-16`). Fix: add
  `referrerPolicy="strict-origin-when-cross-origin"` and `allow="encrypted-media; picture-in-picture"`.
- LOW (hardening): No security headers are set (`netlify.toml` has none). Fix: add a `[[headers]]` block with a
  Content-Security-Policy (`frame-src https://www.youtube-nocookie.com`, `img-src 'self' https://cdn.myanimelist.net data:`),
  `X-Content-Type-Options: nosniff`, and `Referrer-Policy`. This also acts as an automatic block against any iframe added by mistake later.
  (Needs a live test, since the Supabase connection also needs to be allowed in `connect-src`.)

### 5. Adult content: PARTIAL (protected, but with only one layer for lists)

What passes:
- `jikanGet` always adds `sfw=true` to every request, after the caller's params, so no caller can turn it off (`jikan.js:19`).
- The detail path has its own second check: `isAdult()` (`jikan.js:80-85`) rejects `Rx` ratings and `Hentai`/`Erotica` in `genres`
  or `explicit_genres`; `animeById` returns `null` (shown as "not found") for those (`jikan.js:116`). Mock tests:
  `Rx - Hentai` returns null; Hentai/Erotica genre tags are detected; `R+ - Mild Nudity` with "Ecchi" is allowed (R+ is
  not adult by Jikan's rules; the PRD does not ban it, but the owner may want to decide).
- `whoItsFor` never labels an Rx show (`whoItsFor.js:57`).

Problems:
- MEDIUM: **Lists and search rely only on Jikan's `sfw=true`.** `toList` (`jikan.js:61-66`) never runs `isAdult` on results, and
  `cleanAnime` throws away the rating information before anyone could check. If Jikan's `sfw` filter ever misses an item, it
  would show up in search, browse, and home rows (PRD success criterion: "No adult titles show up in search, browse, or
  home rows"). Fix: in `toList`, do `(json.data || []).filter((raw) => !isAdult(raw)).map(cleanAnime)` before cleaning.
- MEDIUM-LOW: **The `rating` search filter is passed through unchecked** (`anime-list.js:31-33`), so `?kind=search&rating=rx`
  is allowed through to Jikan. `sfw=true` should still block it, but this is a path where someone asks for adult
  ratings on purpose. Fix: allow only `g, pg, pg13, r17, r` and drop `rx`.
- UNVERIFIED: I believe (but could not test, no network) that Jikan's `/anime/{id}/full` endpoint ignores `sfw`. That is why the
  `isAdult` check in `animeById` matters. Please test live with a known Rx id (for example search MAL for a hentai title and
  open `/anime/<its id>`) and confirm "not found".
- UNVERIFIED: whether `isAdult` is complete. It does not check the "Boys Love"/"Girls Love" tags (not adult by Jikan's own
  definition) and the check for `Rx` is case-sensitive (`"rx"` lowercase is not caught, mock confirmed, but Jikan sends `"Rx - Hentai"`).

### 6. Injection and XSS: PASS

- No `dangerouslySetInnerHTML`, `innerHTML`, or `eval` anywhere in `src/` or `netlify/` (grep). All API text is rendered as normal React
  text (mock with `<script>` and `<img onerror>` in the synopsis showed it escaped as `&lt;img...`).
- Links: every `target="_blank"` has `rel="noreferrer"` or `"noreferrer noopener"` (`Detail.jsx:124,128,129`, `Footer.jsx:11`).
- `malUrl` is only used as a link if it starts with `https://myanimelist.net/` (`Detail.jsx:65`); a mock with `javascript:alert(1)`
  produced no link. The trailing slash in the check blocks look-alike hosts such as `myanimelist.net.evil.com`.
- YouTube id is checked with `/^[\w-]{6,20}$/` before being placed in the iframe address (`Trailer.jsx:5`); a mock with
  `"><script>` produced "No official trailer available".
- Reddit link uses `encodeURIComponent` (`Detail.jsx:64`). The detail request also uses `encodeURIComponent(id)` (`api.js:13`).
- Cover and banner image addresses come from Jikan and are not checked (`Detail.jsx:72-77`), but an `<img src>` cannot run code, so
  this is fine. LOW hardening: only accept `https://` image URLs.

### 7. Input validation on id and query params: PARTIAL

- `id`: PASS. `anime-detail.js:16` requires 1-7 digits and value >= 1, replies 400 otherwise; `animeById` checks again
  (`jikan.js:106-107`). Mock results: `abc`, `-1`, `0`, `1.5`, empty are rejected. (`"1e3"` and a 10-digit number are accepted by
  `animeById` on its own, but the function's regex stops both before they get there.)
- `kind`: PASS. Unknown values give 400 (`anime-list.js:39`).
- `page`, `limit`, and the search filters: see MEDIUM issue in check 3. They are not properly validated.
- The `/anime/:id` route on the website side is not validated, but it passes the id to the function, which validates it.
- `netlify.toml:13-16` sends `/*` to `index.html`. Netlify normally lets functions with a custom `path` win over this catch-all,
  but I could not test it. UNVERIFIED: after deploying, open `/api/anime-detail?id=1` and confirm you get JSON, not the website page.

### 8. Accessibility and mobile basics: PARTIAL

Good:
- `<html lang="en">` and a proper viewport tag (`index.html:2,5`); search box has `aria-label` (`Header.jsx:36`).
- Cover image has `alt={title}` (`Detail.jsx:77`); decorative banner correctly has `alt=""` (`:72-73`); trailer iframe has a `title`.
- Detail layout uses flexible sizes: facts grid is `minmax(140px,1fr)`, the trailer is 16:9 at 100% width, `overflow-wrap: anywhere` on
  `.detail`, the page container has 16px side padding (`styles.css:14,76-109`). No fixed widths wider than 360px on the detail page itself.
- Headings go in order (h1 title, h2 sections).

Problems:
- MEDIUM (unverified, no browser): **Header probably overflows sideways on a 360px phone.** `.header-inner` is one non-wrapping row
  (`styles.css:20`) holding the logo, the search box, "Browse", and login/My List/Log out. A text input will not shrink below its default
  width inside a flex row, so these add up to roughly 400-450px. This is a PRD success criterion ("no sideways scrolling").
  Fix: add `.search { min-width: 0 }` and `.search input { min-width: 0 }`, let the header wrap or hide the "Browse" link under ~500px
  (`flex-wrap: wrap` with the search box on its own full-width line).
- LOW: `AnimeCard.jsx:8` uses `alt={anime.title}` (not the English title shown under it) and renders `<img src="">` if a show has no image
  (`image` can be an empty string). Fix: `alt={anime.titleEnglish || anime.title}` and only render the img when `anime.image` exists.
- LOW: `Login.jsx:43` (and the email field) use placeholder text only, no `<label>`, which screen readers handle poorly. Fix: add labels or `aria-label`.
- LOW: Loading and error messages (`Detail.jsx:38,43`) are not announced to screen readers. Fix: `role="status"` on loading, `role="alert"` on errors.
- LOW: no visible keyboard-focus style on buttons and cards (only the search box has one, `styles.css:26`). Fix: add a global `:focus-visible` outline.
- Note: the PRD wants a light pink default theme; the current CSS is dark (`styles.css:1`). That belongs to milestone M7b, so I'm not counting it against M2.

### 9. `npm run build`: PASS

`vite build` succeeded: 124 modules, `dist/assets/index-*.js` 280.55 kB (84.89 kB gzipped), CSS 5.24 kB. No errors or warnings.
(It rewrote `dist/`, which is git-ignored.)

---

## Extra finding outside the 9 checks (login, affects the Detail page's "Add to My List" button)

- MEDIUM / UNVERIFIED: **My List safety depends entirely on Row Level Security (RLS) that I could not check.** `AddToListButton.jsx:20`
  (select) and `:41` (delete) filter only by `mal_id`, not by the user. If the `my_list` table's RLS policies are missing or
  wrong, a logged-in user's "Remove from My List" would delete *everyone's* rows for that show, and the select would read other
  people's rows. The insert (`:43`) also relies on the database filling in `user_id`. The code is fine only if RLS is correct.
  Fix: (a) in the Supabase dashboard confirm RLS is ON for `my_list` and that policies use `auth.uid() = user_id` for select, insert,
  delete, and `user_id default auth.uid()`; (b) as a belt-and-braces measure, add `.eq("user_id", user.id)` to the select and delete.
  (PRD section 10 already requires the QA agent to test that user A cannot read user B's list; that needs two real test accounts
  on the live project and is still open.)

---

## Issue list ranked by severity

| # | Severity | Issue | Where | Suggested fix |
|---|---|---|---|---|
| 1 | Medium | List/search inputs not validated; unlimited distinct pages/filters = unlimited Jikan calls and memory growth | `anime-list.js:12-13,31-35`; `cache.js:5-14` | Cap `page`, clamp `limit` >= 1, allowlist/regex every filter, give the cache a max size and expiry cleanup |
| 2 | Medium | Adult filtering for lists/search relies only on Jikan `sfw=true`; `rating=rx` can be requested | `jikan.js:61-66`; `anime-list.js:31-33` | Run `isAdult` on raw results in `toList`; allowlist ratings without `rx` |
| 3 | Medium | Rate limiter is per function copy, its queue is unbounded, no duplicate-request sharing | `rateLimiter.js:6-27`; `cache.js:8-14` | Share in-flight promises in `cached()`; reject with 503 when the queue is long; longer term use a shared cache |
| 4 | Medium (unverified) | Header likely overflows horizontally at 360px | `styles.css:20,22-26`; `Header.jsx` | `min-width: 0` on search, allow wrap / hide links on small screens; test in a real phone-size browser |
| 5 | Medium (unverified) | My List relies on Supabase RLS, which was not checked; client queries don't filter by user | `AddToListButton.jsx:20,41,43` | Verify RLS policies on live project; add `.eq("user_id", user.id)` |
| 6 | Low | Score 0 prints a stray "0" | `Detail.jsx:81`; `AnimeCard.jsx:9` | Use `anime.score > 0 &&` |
| 7 | Low | Errors may be cached by browsers for 60s | `cache.js:22` | `Cache-Control: no-store` for status >= 400 |
| 8 | Low | Producers, popularity, members fetched but not shown | `jikan.js:97-100`; `Detail.jsx:53-62` | Show them or stop fetching |
| 9 | Low | Chips duplicated; possible duplicate React keys | `Detail.jsx:94-98,109-113` | Show once; `key={t + i}` |
| 10 | Low | `/anime/abc` (400) shows generic error instead of "not found" | `Detail.jsx:28` | Treat 400 like 404 |
| 11 | Low | No React error boundary; wrong-type data would blank the page | `App.jsx` | Add an error boundary around routes |
| 12 | Low | No security headers/CSP; trailer iframe lacks referrerPolicy/allow | `netlify.toml`; `Trailer.jsx:11` | Add `[[headers]]` with CSP, nosniff, referrer policy; add iframe attributes |
| 13 | Low | Small accessibility gaps (card alt text, empty image src, Login labels, announcements, focus outline) | `AnimeCard.jsx:8`; `Login.jsx:43`; `Detail.jsx:38,43`; `styles.css` | See check 8 |
| 14 | Low | Detail id range up to 9,999,999 | `anime-detail.js:16` | Optionally cap at ~200000 |

## Still to test once the site is live (could not be done in this sandbox)

1. Open a few real anime pages (one with trailer, one without, one very old with little data) and a made-up id like `/anime/99999999`.
2. Confirm a known adult title id shows "not found" on the detail page and never appears in search/browse.
3. Open `/api/anime-detail?id=1` directly and confirm you get JSON (not the website page).
4. Look at the site at 360px wide (Chrome DevTools phone mode) for sideways scrolling, especially the header.
5. Two Supabase test accounts: confirm user A cannot see or delete user B's My List rows.
6. Run a secret scan over the full git history.
