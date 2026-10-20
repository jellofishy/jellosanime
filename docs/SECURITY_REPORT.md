# Security Report: jellosanime

Reviewer: Security and Deployment Agent  |  Date: 2026-10-20
Scope: everything in `netlify/`, `src/`, `index.html`, `netlify.toml`, `.gitignore`, `.env.example`, `package.json`, plus the live Supabase project `lfxqfrkyfbewonhpjqhv` (read-only checks).
I did not change any code under `src/` or `netlify/`. Fixes for those files are written below as exact suggestions.

## Plain-English summary

jellosanime is in good shape for a school project. **No secret is committed anywhere, no High problems were found, and the database is locked down so each person can only see their own My List.**

| Result | Count |
|---|---|
| High | 0 |
| Medium | 1 |
| Low | 7 |
| Checks that PASS | 21 |
| Checks that FAIL | 0 (the Medium and Low items are "could be better", not "broken") |

Words used here: **RLS** (Row Level Security) is a Supabase rule that decides which database rows each logged-in person may touch. **CSP** (Content Security Policy) is a browser rule that lists which websites a page may load things from. **XSS** is when an attacker gets their own code to run in your page.

## What I changed (Part 2)

- `public/_headers` (new): security headers for the whole site (CSP, no framing, no sniffing, referrer policy, permissions policy, HTTPS-only for a year) and a one-year cache for the fingerprinted `/assets/*` files.
- `netlify.toml`: kept the build, functions, dev and catch-all redirect settings. Added an explicit `/api/*` rule *before* the catch-all so a typo like `/api/foo` returns a real 404 and never the website page. Added `NODE_VERSION = "22"` and `SECRETS_SCAN_OMIT_KEYS` (explained in finding L7).
- `npm run build` still passes and `dist/_headers` is produced.

The inline theme script in `index.html` still works under the CSP. I allowed it with a SHA-256 fingerprint instead of `'unsafe-inline'`:
`sha256-qwSC7aupEs9XOHA1iNRXlgyKFKc9I/f62JgZGB02U9o=` (computed with Node over the exact text between `<script>` and `</script>`; the built `dist/index.html` gives the same value). **If anyone edits that script, the fingerprint must be recomputed** (steps are in a comment at the top of `public/_headers`).
UNVERIFIED (needs a live deploy): that no part of the app needs `style-src 'unsafe-inline'`. React sets styles through the browser's style API, which CSP allows, and the built HTML has no `<style>` tags or `style="..."` attributes, so I expect it to be fine. If the live site looks unstyled somewhere, open the browser console (F12), look for "Refused to apply inline style", and tell me.

Note: `npm run dev` (`netlify dev`) reads headers from the built `dist/` folder, so the strict CSP only matters on the real site; local `vite` itself is unaffected.

## Part 1 results by check

### (a) Secrets

| # | Check | Result | Evidence |
|---|---|---|---|
| a1 | No secrets in current files | PASS | Searched everything except `node_modules`, `dist`, `.git` for `sb_secret`, `service_role`, `eyJhbGci`, `api_key=`: only hits are warning comments (`src/auth/supabaseClient.js:4`) and docs text. |
| a2 | No secrets in git history | PASS | `git log --all -p` searched for `sb_secret_`, JWT-style `eyJhbGci`, `TMDB_API_KEY=<value>`, `api_key=<20+ chars>`: zero real values. The word `service_role` appears only in docs/comments. `git log --all --diff-filter=A` shows the only `.env*` file ever added is `.env.example`. |
| a3 | `.env` untracked and ignored | PASS | `.gitignore:69` ignores `.env` (and `.env.*` at line 70, except `!.env.example`). `git ls-files` lists only `.env.example`. |
| a4 | `.env.example` has no real values | PASS | `.env.example:5-6,9` are all empty (`VITE_SUPABASE_URL=`, etc.). |
| a5 | Only public values reach the browser | PASS | Ran `npm run build` and searched `dist/`: no `TMDB_API_KEY`, `api_key`, `sb_secret` or `service_role`. The only key-like value in the bundle is the Supabase `sb_publishable_...` key plus the project URL, which are public by design. `TMDB_API_KEY` is only read in `netlify/adapters/tmdb.js` through `process.env`, server side, and is never logged or returned (errors are generic). |
| a6 | The local `.env` is safe | PASS | It holds only the two public Supabase values (checked names only, did not print values). It is ignored by git. |

### (b) Supabase (project `lfxqfrkyfbewonhpjqhv`, read-only queries)

| # | Check | Result | Evidence |
|---|---|---|---|
| b1 | RLS enabled on `public.my_list` | PASS | `relrowsecurity = true`. |
| b2 | Policies scoped to the logged-in user | PASS | Three policies, all for role `authenticated`: SELECT "read own list" `(select auth.uid()) = user_id`; INSERT "add to own list" with check `(select auth.uid()) = user_id`; DELETE "remove from own list" `(select auth.uid()) = user_id`. No UPDATE policy, so editing rows is impossible (not needed). Nothing for `anon`, so logged-out visitors get nothing. |
| b3 | Other exposed tables | PASS | `public` contains only `my_list`. No other tables, views or materialized views. |
| b4 | Security advisor | PASS | `get_advisors(security)` returned **0 issues**. |
| b5 | Table design | PASS | `user_id uuid NOT NULL DEFAULT auth.uid()` (so the browser cannot choose someone else's id; the insert policy would also reject it), primary key `(user_id, mal_id)` (no duplicates), foreign key to `auth.users` with `ON DELETE CASCADE`. |
| b6 | Browser code never uses a secret Supabase key | PASS | `src/auth/supabaseClient.js:7-11` only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. |

### (c) Injection, XSS, open redirect, SSRF

| # | Check | Result | Evidence |
|---|---|---|---|
| c1 | `id` parameters validated | PASS | `anime-detail.js:14` and `anime-extras.js:75` accept only `^[0-9]{1,7}$` and a value of 1 or more before any use. |
| c2 | List/search parameters validated | PASS | `anime-list.js:12-44`: every filter is checked against a fixed list or a strict pattern; unknown values are dropped; `page` is clamped 1-50, `limit` 1-24, search text cut to 100 characters. Unknown `kind` returns 400 (`anime-list.js:80`). |
| c3 | SPARQL injection guard | PASS | `wikidata.js:15-20` (`cleanMalId`) only lets 1-9 digits through, *before* `buildQuery` (`wikidata.js:23-33`) inserts it in quotes. Nothing else enters the query text. Wikidata results are re-checked: item id must match `^Q[0-9]+$` (line 56), AniList/Kitsu ids must be digits, and the article link must start with `https://en.wikipedia.org/wiki/` (line 38). |
| c4 | GraphQL (AniList) injection | PASS | `anilist.js` sends the id as a GraphQL *variable* (`anilistQuery(query, variables)`, line 15-23), never glued into the query text. |
| c5 | Outbound URLs and SSRF (server fetching a user-chosen URL) | PASS | All server-side `fetch` calls go to fixed hosts: `api.jikan.moe`, `graphql.anilist.co`, `kitsu.io`, `query.wikidata.org`, `en.wikipedia.org`, `api.themoviedb.org`. User input only becomes a query-string value (via `URLSearchParams`/`encodeURIComponent`) or a validated number. No endpoint fetches a URL that a visitor supplies. |
| c6 | Header injection | PASS | Response headers are fixed strings (`cache.js:55-60`); no user input is ever placed in a header. |
| c7 | XSS in the browser | PASS | No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `document.write` anywhere in `src/`. React escapes all text. Review/Wikipedia text is stripped of HTML on the server (`wikipedia.js` `cleanExtract`, `kitsu.js` `stripText`, `anilist.js` `stripMarkup`). The CSP is a second layer. |
| c8 | Links and images from APIs | PASS | Every external link is `https` only and checked (`src/safeUrl.js`, `extrasBuilder.js` `safeHttps` + per-source host allowlist for reviews, `Detail.jsx:111` MAL link prefix, `tmdb.js` link prefix, `wikipedia.js` `safeWikiUrl`). All `target="_blank"` links have `rel="noopener noreferrer"`. |
| c9 | Open redirect | PASS | The only redirects are `navigate("/my-list")` (a fixed path, `Login.jsx:25,30`) and the Supabase `redirectTo: window.location.origin` (`Login.jsx:36`). No redirect target comes from the URL or from user input. |
| c10 | Trailer iframe | PASS | `Trailer.jsx:4` only allows ids matching `^[\w-]{6,20}$` and builds `https://www.youtube-nocookie.com/embed/<id>`; the CSP also limits frames to that one host. |
| c11 | Kitsu id in a request path | LOW, see L3 | `kitsu.js` puts an id from Kitsu's reply into `/anime/${kitsuId}` without a digits check. Cannot leave the Kitsu host, so it is not exploitable, but one line makes it airtight. |

### (d) Piracy and adult-content protections

| # | Check | Result | Evidence |
|---|---|---|---|
| d1 | Allowlist of legal services | PASS | `streamingSites.js:8-23` lists the only allowed services; `classifyLink` (line 71-95) requires `https`, no username/password, no port, an exact-or-subdomain host match (so `crunchyroll.com.evil.com` and `crunchyroll.com@evil.com` fail). Amazon only counts for `/gp/video` or `/dp/` paths. |
| d2 | Piracy blocklist | PASS | `BLOCKLIST` (`streamingSites.js:29-36`) is checked *before* the allowlist in `classifyLink`, and also on unparseable text. |
| d3 | Every link path goes through the gatekeeper | PASS | `buildWhereToWatch` (`extrasBuilder.js`) feeds Kitsu, AniList external and episode links into `splitLinks`, and builds search links from `searchLinks`, which re-filters its own output. TMDB gives names and logos only, never a stream link. |
| d4 | Adult content blocked on every path | PASS | Jikan: `sfw=true` on every request (`jikan.js:19`) plus an `isAdult` filter on lists and the detail page (`jikan.js:62-63,82-87,118`), and `rx` rating is not an allowed filter (`anime-list.js:12`). AniList: `isAdult: false` and `isAdult` re-check (`anilist.js:89,123,222,272`), adult tags hidden (line 147). Kitsu: `nsfw`/`R18` dropped (`kitsu.js:117-118,155`). TMDB: `include_adult=false` plus `adult` re-check (`tmdb.js:121,186,201`). |
| d5 | Note: YouTube and Plex/Roku allowlist is broad | LOW, see L4 | |

### (e) Rate limit and abuse resistance

| # | Check | Result | Evidence |
|---|---|---|---|
| e1 | Params bounded | PASS | See c1/c2: ids, pages, limits, search length, filters all bounded. |
| e2 | In-memory cache bounded | PASS | `cache.js:6,9-15` caps at 500 entries and evicts the oldest. Errors are never cached; identical simultaneous requests share one fetch. |
| e3 | Outbound limits to the data sources | PASS | `rateLimiter.js`: spacing + per-minute budget + a waiting-line cap of 40 (answers 503 "Busy" instead of waiting forever). Every source call has a timeout (8-9 s). |
| e4 | Cache-bypass can overload the free data sources | MEDIUM, see M1 | |

### (f) Dependencies

| # | Check | Result | Evidence |
|---|---|---|---|
| f1 | Lockfile committed | PASS | `package-lock.json` is tracked in git. |
| f2 | Versions | PASS | `@supabase/supabase-js` is pinned exactly (`2.45.4`); React and Router use `^` ranges, but the lockfile fixes the exact versions installed (React Router `6.30.6`). |
| f3 | `npm audit --omit=dev` | 4 findings (2 low, 2 moderate), see L1 and L2 | Report only; I changed nothing. |

### (g) CORS and caching headers on functions

| # | Check | Result | Evidence |
|---|---|---|---|
| g1 | CORS | PASS | The functions send no `Access-Control-Allow-Origin` at all, so other websites cannot read the API from a browser. The site calls them from the same origin. |
| g2 | Sensitive data cached publicly | PASS | The functions return only public anime data. No cookies, no user data, no keys. The Supabase calls go straight from the browser to Supabase, not through the CDN. |
| g3 | Errors not cached | PASS | `cache.js:45-52`: errors use `no-store`; only a 404 may be remembered, for at most 1 hour. |

## Findings, ranked

### HIGH
None.

### MEDIUM

**M1. Visitors can bypass the cache and use up the free-source budget (denial of service).**
Where: `netlify/functions/anime-list.js:70-74` (cache key includes free text `q`), and `anime-detail.js`/`anime-extras.js` (any new `id`).
Why: Netlify's CDN caches per exact URL. Someone requesting `/api/anime-list?kind=search&q=a1`, `q=a2`, `q=a3`... or ids 1 to 9999999 forces a fresh Jikan call each time. The limiter protects Jikan by turning the 41st waiting call into a 503, but that also makes the site show "Busy" to real visitors. It cannot leak data or run code.
Fix (small, safe):
1. In `anime-list.js` change line 70 to `const q = (p.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);` so "Naruto" and "naruto  " share an answer.
2. In `netlify/shared/cache.js` `jsonResponse`, add one line inside the success branch so junk query words cannot create new cache entries: `headers["Netlify-Vary"] = "query=kind|q|page|limit|type|status|rating|genres|start_date|end_date|year|season|order_by|sort|id";`
3. Later, if abuse ever appears: Netlify's built-in rate-limiting rules (Site configuration, Security) can cap requests per visitor. For a school project this is optional.

### LOW

**L1. `@supabase/supabase-js` 2.45.4 has a low-severity advisory (via `@supabase/auth-js`, "insecure path routing from malformed input").** Fix: `npm install @supabase/supabase-js@2.58.0` (any current 2.x release newer than the advisory range), then `npm run build` and test log in once. Low because the app only sends email/password to Supabase's own address.

**L2. `react-router-dom` (6.30.6) has two moderate advisories (open redirect via backslash in `<Link>`/`navigate`; constructor injection during server-side rendering hydration).** Not reachable here: the app never navigates to a user-supplied path and does not use server-side rendering. The only fix `npm audit` offers is React Router 7 (a breaking upgrade), so I recommend **leaving it** until after the project is handed in.

**L3. Kitsu id not checked as digits.** `netlify/adapters/kitsu.js`, at the end of `kitsuIdFromMal` (the line `return item ? String(item.id) : null;`). Fix: `return item && /^[0-9]{1,12}$/.test(String(item.id)) ? String(item.id) : null;`

**L4. Allowlist is a little wide for YouTube, Plex and Roku.** `streamingSites.js:11-16` allows any `youtube.com` link and any `plex.tv`/`roku.com` link, which could include unofficial uploads of episodes if Kitsu or AniList listed one. Their data is curated, and the blocklist backs it up, so risk is small. Optional fix: for YouTube only accept links whose path starts with `/channel/`, `/@` or `/playlist`, or drop YouTube from the allowlist and keep only the search link.

**L5. My List columns have no length limits.** Live table `public.my_list`: `title` and `image` are plain `text`. A logged-in user could store a huge string or a non-https image address in their *own* rows (only they ever see them, and `<img>` ignores `javascript:`), so this is just tidiness. Optional fix, run in Supabase, SQL editor:
```sql
alter table public.my_list
  add constraint my_list_title_len check (char_length(title) <= 300),
  add constraint my_list_image_https check (image is null or (image like 'https://%' and char_length(image) <= 500)),
  add constraint my_list_mal_id_pos check (mal_id > 0);
```

**L6. Extra database permissions on `my_list`.** The roles `anon` and `authenticated` hold broad table grants (including `TRUNCATE`, `TRIGGER`, `REFERENCES`, `UPDATE`), which is Supabase's default. RLS blocks all reads/writes that have no policy, and Supabase's web API cannot run `TRUNCATE`, so nothing is exploitable. For tidiness (defence in depth), run:
```sql
revoke all on public.my_list from anon;
revoke truncate, trigger, references, update on public.my_list from authenticated;
```
Test My List afterwards. (select/insert/delete stay for logged-in users.)

**L7. Netlify's secret scanner could fail the first build.** Netlify scans the finished site for values of your environment variables. The two public Supabase values are *meant* to be in the site, so the scan could stop the deploy. Already handled: `netlify.toml` now sets `SECRETS_SCAN_OMIT_KEYS` for exactly those two names. `TMDB_API_KEY` is deliberately *not* in that list, so Netlify would stop the build if the TMDB key ever leaked into the site.

**L8 (settings to review by hand).** Supabase Auth settings are not readable with my tools. In Supabase, Authentication: keep "Confirm email" turned **on**; raise minimum password length to 8 or more (the page only demands 6, `Login.jsx:42`); and set Site URL and Redirect URLs to your Netlify address (see `docs/DEPLOY.md` step 4). Without Redirect URLs, confirmation and reset links can point to `localhost`.

## Things I could not verify

- Live API answers (no network from the sandbox). Real shapes of Wikidata `P4082`, AniList review fields, Pluto TV/RetroCrush/Plex/Roku search URLs and the TMDB logo address are listed in `docs/DEPLOY.md` section 8.
- That Netlify honours `public/_headers` and the redirect order exactly as written (needs a live deploy). Test: open `https://YOUR-SITE.netlify.app/api/anime-detail?id=1` (must be JSON) and `/api/nope` (must be a 404, not the website), then check the headers in DevTools, Network tab, click the first request, Headers.
- Supabase Auth dashboard settings (L8) and Supabase email sending limits.
