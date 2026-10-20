# How to put jellosanime on the internet (Netlify + GitHub)

This guide is for a complete beginner. Follow the numbered steps in order. Nothing here costs money.
Time needed: about 30 minutes.

Words you will see:
- **Repository ("repo")**: your project's folder on GitHub.
- **Branch**: a separate version of your project. `main` is the "official" one. Your work lives on `claude/clever-ptolemy-gk4k08`.
- **Pull request ("PR")**: a request on GitHub to copy one branch's changes into another.
- **Deploy**: Netlify builds your project and puts it on a public web address.
- **Environment variable**: a setting (like a password) you give to Netlify instead of writing it in your code.

---

## 1. What you need

1. A **GitHub account** with the repo `jellofishy/jellosanime`.
2. A **Netlify account** (free; you will sign up in step 2 using GitHub).
3. Your **Supabase** project (already made: `lfxqfrkyfbewonhpjqhv`).
4. Optional: a free **TMDB** account for extra pictures (step 3).

### Choose how to deploy: merge to `main` (recommended) or deploy the branch

**Option A (recommended): merge the branch into `main` with a pull request.**
Why: Netlify deploys `main` by default, and the site updates automatically whenever `main` changes.

1. Go to https://github.com/jellofishy/jellosanime and sign in.
2. You may see a yellow banner "claude/clever-ptolemy-gk4k08 had recent pushes" with a green **Compare & pull request** button. Click it. If not, click the **Pull requests** tab, then **New pull request**.
3. Set **base: main** (left) and **compare: claude/clever-ptolemy-gk4k08** (right).
4. Click **Create pull request**, give it a title like "First release", click **Create pull request** again.
5. Scroll down. If it says "This branch has no conflicts", click the green **Merge pull request**, then **Confirm merge**.
   If it says there are conflicts, stop and ask your teacher or the Claude agent to fix them; do not guess.

**Option B: deploy the branch directly (skip the merge).** In step 2 below, when Netlify asks for the "Branch to deploy", choose `claude/clever-ptolemy-gk4k08` instead of `main`. Later, if you switch to `main`, change it under Site configuration, Build & deploy, Branches and deploy contexts.

---

## 2. Create the Netlify site

1. Go to https://app.netlify.com and click **Sign up**. Choose **GitHub** and approve the pop-up. (Using GitHub makes connecting your repo easy.)
2. On your Netlify dashboard click **Add new site**, then **Import an existing project**.
3. Click **Deploy with GitHub**. If asked, click **Authorize Netlify**. If your repo is not listed, click **Configure the Netlify app on GitHub**, choose your account, select **Only select repositories**, add `jellosanime`, and **Save**.
4. Pick **jellosanime** from the list.
5. On the settings page you should see these values. They are read from `netlify.toml`, so just check they match:
   - Branch to deploy: `main` (or your branch, Option B)
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. **Do not click Deploy yet.** Click **Add environment variables** (or expand "Advanced") and do step 3 first. If you already deployed, that is fine; you will just redeploy after step 3.

---

## 3. Add your settings (environment variables)

If you are not on the setup page: open your site, then **Site configuration**, then **Environment variables**, then **Add a variable**.

**IMPORTANT:** The two `VITE_` variables must exist **before the build runs**, because they are baked into the website while it is being built. If you add or change them later, you must **redeploy** (Deploys tab, **Trigger deploy**, **Clear cache and deploy site**).

### 3a. VITE_SUPABASE_URL
- Key: `VITE_SUPABASE_URL`
- Value: `https://lfxqfrkyfbewonhpjqhv.supabase.co`

### 3b. VITE_SUPABASE_PUBLISHABLE_KEY
1. Open https://supabase.com/dashboard and choose your project.
2. Left menu: **Project Settings** (gear icon), then **API Keys**.
3. Find the key named **publishable** (it starts with `sb_publishable_`). Click the copy icon.
4. In Netlify add key `VITE_SUPABASE_PUBLISHABLE_KEY` and paste the value.

This key is **meant to be public**; your data is protected by database rules, not by hiding this key.
**NEVER copy the "secret" key (starts with `sb_secret_`) or a "service_role" key into Netlify or into your code.** That one can read everything.

### 3c. TMDB_API_KEY (optional)
The site works without it. With it, you get extra pictures and "available on" names from TMDB.
1. Create a free account at https://www.themoviedb.org/signup and confirm your email.
2. Go to https://www.themoviedb.org/settings/api and request an API key (choose "Developer", personal/educational use, fill in the form honestly; the site name can be "jellosanime school project").
3. Copy the **API Key** (32 letters and numbers) or the **API Read Access Token** (a very long text starting `eyJ`). Either works.
4. In Netlify add key `TMDB_API_KEY`, paste it, and turn on **Contains secret values** (or set scope to include Functions). Do **not** put `VITE_` in front of this one: that would put it in the public website.

Now click **Deploy jellosanime** (or redeploy). The first build takes about 1 to 2 minutes. When the top of the page says **Published**, click the address shown (like `https://random-name-123.netlify.app`).

---

## 4. Tell Supabase your website address

Do this after you have your Netlify address. Why: when someone signs up, Supabase emails a confirmation link; when someone forgets a password, it emails a reset link. Those links need to lead back to your real site. If you skip this, the links go to `localhost` (which only works on your own computer) and sign-up looks broken.

1. Supabase dashboard, your project, **Authentication**, then **URL Configuration**.
2. **Site URL**: paste your Netlify address, for example `https://jellosanime.netlify.app` (no slash at the end).
3. **Redirect URLs**: click **Add URL** and add the same address, plus `https://jellosanime.netlify.app/**`. (Optional for testing on your own computer: also add `http://localhost:5173/**`.)
4. Click **Save changes**.

About email: Authentication, **Sign In / Providers**, **Email**: keep **Confirm email** turned on. While you use Supabase's built-in email sending, it only sends a **few emails per hour** (about 2 to 4 for the free built-in sender). If you test a lot, you will get "email rate limit exceeded". Wait an hour, or reuse the same test account instead of creating new ones. Confirmation emails may also land in **spam**. For a real launch you would connect your own email service (Authentication, SMTP Settings), but that is not needed for a school project.

Also recommended: Authentication, **Policies / Password**: set the minimum password length to 8.

---

## 5. First-run checklist (click through the live site)

Open your Netlify address and tick each one:

- [ ] **Home**: rows of anime appear (trending, airing today, top, etc.). Pictures load. The first load can take a few seconds.
- [ ] **Search**: type "naruto" in the search box. Results appear. Try a filter. Nothing adult appears.
- [ ] **Detail page**: click any anime. Title, picture, synopsis and "who it's for" show.
- [ ] **Trailer**: the YouTube video box appears and plays (or says "No official trailer available", which is normal for some).
- [ ] **Where to watch**: legal services show (Crunchyroll, Tubi, etc.). Click one: it opens the official site in a new tab.
- [ ] **Reviews**: review cards appear (or "No reviews found yet").
- [ ] **Wikipedia credit**: a background paragraph with "CC BY-SA 4.0" and a link to Wikipedia.
- [ ] **Theme toggle**: switch light/dark. Refresh the page: your choice stays.
- [ ] **Sign up**: go to Login, Create an account, use an email you can open. You see "Check your email".
- [ ] **Confirm**: open the email, click the link. It must open **your Netlify site**, not `localhost`.
- [ ] **Log in** with that email and password. You land on My List.
- [ ] **Add to My List**: open an anime, click "Add to My List". The heart fills.
- [ ] **Refresh** the My List page: the anime is still there.
- [ ] **Log out**, then log in as a different new account if you can: the other list must **not** show your anime.
- [ ] **Refresh on a detail page** (for example `/anime/1`): the page still loads (no "Page not found").
- [ ] **API check**: visit `https://YOUR-SITE.netlify.app/api/anime-detail?id=1`. You must see text with curly brackets (JSON), not the website. Visit `/api/nope`: it must be a "not found" message, not the website.

---

## 6. When something goes wrong

### Where to look
- **Netlify build problems**: Netlify, your site, **Deploys**, click the latest deploy. Read the log from the bottom up. The red line says what failed.
- **Back-end (function) problems**: Netlify, your site, **Logs**, then **Functions**, click the function name (like `anime-list`). Reload the website page that failed, then refresh the log.
- **Front-end problems**: on the live site press **F12** (or right-click, **Inspect**), open the **Console** tab for red errors and the **Network** tab to see which request failed (click it to see its status number and reply).

### Common problems

| Problem | Likely cause | Fix |
|---|---|---|
| **Build fails: "Secrets scanning found secrets"** | Netlify noticed a variable value inside the built site | `netlify.toml` already skips the two public Supabase values. If it names `TMDB_API_KEY`, the key leaked into the code: make sure it is not called `VITE_...` and not written in any file. |
| **Blank white page** | Build used the wrong folder, or a script error | Check the Publish directory is `dist`. Open F12 Console and read the red error. If it mentions "Content Security Policy", copy the message and report it (our `public/_headers` file may need one more allowed website). |
| **"Login isn't set up yet"** | The `VITE_` variables are missing or were added after the build | Add both in Netlify (step 3), then **Clear cache and deploy site**. Variable names must match exactly. |
| **404 "Page not found" when refreshing a page like /anime/1** | Redirect rule missing | Make sure `netlify.toml` still has the `/*` to `/index.html` rule (status 200), then redeploy. |
| **`/api/...` shows 404 or the website instead of JSON** | Functions folder not found | Check Functions directory is `netlify/functions` in Site configuration, Build & deploy, Build settings; redeploy. Look under the **Functions** tab: you should see `anime-list`, `anime-detail`, `anime-extras`, `genres`, `trending`, `airing-today`. |
| **`/api/...` returns 502** ("Could not load...") | A data source (Jikan, AniList...) is down or slow | Wait a minute and retry. Check Logs, Functions to see which source failed. The site is built so one failing source does not break the page. |
| **503 "Busy, please try again"** | Too many requests at once; our safety limit kicked in | Wait a few seconds and retry. |
| **Jikan 429 "Too Many Requests" in the function logs** | The free Jikan service asked us to slow down | The code waits and retries automatically. If it persists, reload after a minute. Results are cached, so it improves. |
| **Confirmation / reset email link goes to localhost** | Supabase Site URL still says localhost | Do step 4. Then request a **new** email (old links keep the old address). |
| **"email rate limit exceeded"** | Supabase free email sending limit | Wait an hour, or use an existing account. |
| **My List says nothing saved after adding** | Not logged in, or database rules problem | Make sure you are logged in. Check the Console for a red Supabase error. The database rules were checked and are correct (see SECURITY_REPORT.md). |
| **No TMDB pictures** | `TMDB_API_KEY` missing or wrong | That is fine (optional). To enable: step 3c, then redeploy. |

---

## 7. Choose a nicer address and (optionally) your own domain

**Site name (free):**
1. Netlify, your site, **Site configuration**, **Site details**, **Change site name**.
2. Type `jellosanime` (if taken, try `jellosanime-yourname`). Save.
3. Your address becomes `https://jellosanime.netlify.app`.
4. **Go back to Supabase step 4** and update Site URL and Redirect URLs to the new address.

**Your own domain (optional, costs money, about 10 to 15 dollars a year):**
1. Buy a domain from a registrar (Namecheap, Cloudflare, etc.).
2. Netlify, your site, **Domain management**, **Add a domain**, enter it, and follow the instructions Netlify shows (it tells you exactly which records to set). HTTPS is added automatically.
3. Again update the Supabase Site URL and Redirect URLs to the new domain.

---

## 8. What I could not test from the sandbox (please check once live)

I had no internet access while building, so these were written from documentation and are marked UNVERIFIED in the code and in `docs/QA_REPORT.md`. After deploying, spot-check them. None of them can break the site: the code is built to quietly show nothing if a source answers differently.

1. **Wikidata Kitsu property `P4082`** (`netlify/adapters/wikidata.js`): used to match an anime to Kitsu. Test: open a popular anime's detail page; if reviews from Kitsu never appear for any show, this property may be wrong.
2. **AniList review fields** (`netlify/adapters/anilist.js`): names like review summary/score/body. Test: do AniList reviews appear for popular shows (try Attack on Titan, id 16498)?
3. **Search link patterns** for Pluto TV, RetroCrush, Plex and The Roku Channel (`netlify/shared/streamingSites.js`, the `searchLinks` function). Test: on a detail page, click each "search" button and confirm it opens a sensible search on that site (not an error page). If one is wrong, delete that line.
4. **TMDB logo address** (`TMDB_LOGO_URL` in `netlify/adapters/tmdb.js`): paste it in a browser tab. If you see the blue TMDB logo, you may add it to the footer (there is a TODO in `src/components/Footer.jsx`). If not, copy the correct file from https://www.themoviedb.org/about/logos-attribution.
5. **Jikan single-anime adult filter** (`/anime/{id}/full` may ignore `sfw`): the code filters adult ratings itself; try opening a known adult title's id and confirm "not found".
6. **Netlify behaviour**: that `/api/*` goes to functions (not the website), and that headers from `public/_headers` appear. Test with the API check in step 5 and DevTools Network tab (click the first request, Headers; look for `content-security-policy`).
7. **Content Security Policy**: with the Console open, click through every page. Any red "Refused to load..." message means our policy blocked something that is needed.
8. **Phone layout**: open the live site on a phone (QA noted the header may be tight at 360px wide).
9. **Supabase email delivery**: confirmation email arrives (check spam).

---

## 9. TMDB terms note

TMDB data is free for **non-commercial** use (a school project qualifies). If you add ads, charge money, or run it as a business, you need a separate agreement with TMDB. The site must show the TMDB attribution notice, and it already does in the footer: "This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB." TMDB also asks you not to keep their data longer than 6 months; jellosanime caches for hours only. Terms: https://www.themoviedb.org/api-terms-of-use

Anime data comes from Jikan (MyAnimeList), AniList and Kitsu; Wikipedia text is CC BY-SA 4.0 and is credited next to every excerpt. jellosanime does not host or stream any episodes and only links to legal services.
