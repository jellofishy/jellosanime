# Rork prompt: jellosanime mobile app

How to use: open rork.com, start a new project, and paste everything between the two lines below into the prompt box.
Then use the QR code / preview to try it on your phone.

------------------------------------------------------------

Build a mobile app called **jellosanime**: an anime discovery app (iPhone and Android) that helps people learn about any anime and find where to watch it LEGALLY. The app never hosts, streams or embeds episodes; it only shows trailers (YouTube) and links out to legal streaming services.

## Look and feel
- Cute, clean, anime-inspired. Rounded corners, soft shadows, gentle animations.
- Light theme is the default: pale pink background #FFF5F8, white cards, deep pink accent #C2185B, lavender secondary #6D4AE0, text #3A2A38, muted text #6F5368.
- Dark theme: plum background #1A1322, cards #261C31, text #F8EBF3, pink accent #FF8FBB, lavender #BBA6FF.
- A sun/moon toggle for light/dark, remembered between launches.
- Friendly rounded fonts (Fredoka for titles, Nunito for body text).
- Loading skeleton placeholders (never blank screens), and friendly error messages with a "Try again" button.

## Data: use my existing back end (do NOT call anime sites directly)
Base URL: https://jellosanime.netlify.app   (all are GET requests returning JSON)
- `/api/anime-list?kind=top|popular|airing|season&limit=12&page=1` -> `{ results: Anime[], hasNextPage, credits }`
- `/api/anime-list?kind=search&q=<text>&page=1&limit=24` plus optional filters `genres` (comma-separated ids, max 5), `type` (tv|movie|ova|special|ona|music), `status` (airing|complete|upcoming), `year`, `season` (winter|spring|summer|fall), `order_by` (score|popularity|rank|start_date|title|episodes), `sort` (asc|desc)
- `/api/airing-today` -> `{ results: [{ malId, title, titleEnglish, image, banner, genres, episode, airingAt (unix seconds), score, format }] }`
- `/api/trending` -> `{ results: Anime[] }`
- `/api/genres` -> `{ genres: [{ id, name }] }`
- `/api/anime-detail?id=<malId>` -> `{ anime: Anime + { titleJapanese, themes, demographics, aired, duration, rank, popularity, members, producers, malUrl, whoItsFor: { ageLabel, ageLevel, summary } }, credits }`
- `/api/anime-extras?id=<malId>` -> `{ reviews: [{ source, author, score, recommended, excerpt, url, date }], reviewSummary: { count, averageScore, recommended, notRecommended }, whereToWatch: { free: [{service,url,kind}], subscription: [{service,url,kind}], searchLinks: [{service,url,kind}] }, tmdbProviders, background: { extract, url, title, license, attribution } | null, images: [], banner, tags: [{name,rank}], credits, tmdbAttribution }`
`Anime` = `{ malId, title, titleEnglish, image, banner, synopsis, genres[], type, episodes, status, score, year, season, rating, studios[], trailerYoutubeId, source }`. Any field may be empty or null: never crash on missing data. The detail and extras are loaded separately; show the detail first, then fill in the extras sections as they arrive (each section fails on its own).

## Screens
1. **Home**: big rotating "spotlight" banner (from trending), then horizontal rows: Airing Today (show episode number and the local air time from airingAt), Trending, Top Anime, This Season. A search bar at the top. A "Surprise me" button (random anime) and mood chips (Cozy, Action-packed, Funny, Romantic, Spooky, Mind-bending, Sporty) that open Browse with matching genres.
2. **Browse / Search**: search results grid with paging ("load more"), and a filter sheet: genres (multi-select), year, season, type, status, sort. "Clear filters" button.
3. **Anime detail**: banner/cover, titles, score, facts (type, episodes, status, year/season, duration, studio, rank), genre and tag chips, synopsis, a **"Who it's for"** card (age badge colored by ageLevel: everyone/kids/teens/mature/unknown, plus the summary text), the **official trailer** (embed the YouTube video using trailerYoutubeId when present; otherwise "No official trailer available"), **"What fans think"** (average score, recommended counts, review cards with source badge MyAnimeList/AniList/Kitsu, author, score, a SHORT excerpt only, and a "Read full review" button that opens the original review URL in the browser), **"Where to watch"** (two groups: "Free (legal, ad-supported)" and "Subscription", each as buttons that open the service's link; if both are empty say "We don't know a legal link for this show yet" and show the searchLinks as "Search on free services" buttons; add the note "Availability depends on your country. jellosanime never hosts or streams episodes."), **Background** from Wikipedia (extract + "Text from Wikipedia, CC BY-SA 4.0 - Read the full article" link), a **"Discuss on Reddit"** button that just opens `https://www.reddit.com/search/?q=<title> anime` in the browser (plain link, no Reddit API), a **Share** button, and a heart button for **My List**.
4. **My List**: the user's saved anime (needs login).
5. **Account**: sign up / log in with email + password and "Continue with Google"; log out.
6. **About / Credits** screen listing all data sources with links and what each is used for: Jikan (MyAnimeList), AniList, Kitsu, Wikipedia (CC BY-SA 4.0), Wikidata, TMDB, plus TMDB's required notice exactly: "This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."

## Login and My List (Supabase)
- Supabase URL: https://lfxqfrkyfbewonhpjqhv.supabase.co
- Publishable (anon) key: sb_publishable__HuMe5f29_ESylp8tNdIWg_HS3Flhqu   (public by design; NEVER use or ask for a service_role/secret key in the app)
- Table `my_list` (already exists, Row Level Security already protects it): columns `user_id` (defaults to the signed-in user), `mal_id` integer, `title` text, `image` text, `created_at`. Insert `{mal_id, title, image}` to add, delete by `mal_id` to remove, select to list the current user's items. Browsing the app never requires login; only My List does.

## Rules (important)
- Only link to legal streaming services; never add or suggest piracy sites. Do not embed or play episodes.
- No adult content anywhere.
- Credit every data source in the About screen and next to its data.
- Use short review excerpts only, always with a link to the original.
- Be fast: cache responses in memory for a few minutes, and never call the same endpoint repeatedly in a loop.

------------------------------------------------------------

## Tips
- If Rork asks which stack to use, any option is fine for a school project; the cross-platform one (Expo / React Native) is the simplest to preview on a phone.
- Build screen by screen: ask Rork for Home first, then Detail, then Browse, then Account and My List.
- If the data doesn't load in the preview, open https://jellosanime.netlify.app/api/trending in a browser to check the back end is up.
- The back end is the Netlify site; changes to the website's /api do not need a new app build.
