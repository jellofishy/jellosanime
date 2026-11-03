# Dark redesign ("Midnight") — binding spec and contracts

Owner request: clean, modern UI. Dark by default AND a light theme. Inter font. Rounded cards (12-16px). Poster cards with title and score on a dark
gradient. NO emojis anywhere (use `lucide-react` line icons; the text "⌘K" is a keyboard hint, not an emoji). Keep ALL existing features, APIs, credits and
the legal-only streaming links. This REPLACES the old pink "Frosted Jelly" look (docs/FROSTED_JELLY.md is now historical).

## Visual language
- Dark: page `#0F0F12`, card `#1A1A1F`, raised card `#22222A`, border `rgba(255,255,255,.08)`, headings `#FFFFFF`, secondary text `#A1A1AA` (check >= 4.5:1 on both bg and card).
- Light: page `#F7F7F9`, card `#FFFFFF`, raised `#F0F0F4`, border `rgba(15,15,18,.10)`, headings `#0F0F12`, secondary `#52525B`.
- Font Inter (Google Fonts 400/500/600/700/800), bold section titles (700-800), medium-weight labels (500-600), generous spacing, high contrast.
- Radii 12px (inputs, chips-as-cards), 16px (cards, posters); pills for buttons/chips. Flat cards, soft shadows only; NO glassmorphism/blur, no mesh gradients.
- Poster card: 2:3 poster, title and score overlaid at the bottom on a dark gradient scrim (`linear-gradient(to top, rgba(0,0,0,.85), transparent)`), always white text on the scrim in both themes.
- Accent colors (user chooses): pink `#EC4899`, purple `#8B5CF6`, blue `#3B82F6`, green `#22C55E`, orange `#F97316`. Provide per-mode tuned
  shades so that (a) accent TEXT on the page/card background is >= 4.5:1 and (b) text ON accent fills is >= 4.5:1 (use white or near-black as needed).

## Token contract (src/theme.css, owned by the Foundation agent) — names are binding
Mode on `<html data-theme="dark|light">`, accent on `<html data-accent="pink|purple|blue|green|orange">`. Dark is the default.
Variables: `--bg`, `--card`, `--card-2`, `--border`, `--text` (headings), `--text-2` (body), `--muted` (secondary), `--accent` (accent for text/borders), `--accent-fill`
(button/active fill), `--accent-contrast` (text on --accent-fill), `--accent-soft` (tinted background), `--focus-ring`, `--shadow-1`, `--shadow-2`, `--scrim`,
radii `--r-sm:8px --r-md:12px --r-lg:16px --r-pill:999px`, spacing `--s-1..--s-9` (4,8,12,16,24,32,48,64,96), fonts `--font-sans`, type scale vars,
age badge pairs `--age-everyone-bg/-fg`, `--age-kids-*`, `--age-teens-*`, `--age-mature-*`, `--age-unknown-*`.
KEEP the previous contract names so unmigrated components don't break: `.container .btn .btn-primary .btn-secondary .btn-ghost .btn-sm .btn-lg .chip
.chip-active .badge .skeleton .sr-only .visually-hidden .lift .glass .glass-bar .glass-art .glass-sheet` — but remap `.glass*` to FLAT cards (solid
`--card`, border, no blur) so old markup still looks right. Add `.card`, `.card-raised`, `.input`, `.icon` (1.25em lucide sizing), `.t-h1/.t-h2/.t-h3`.

## Theme API (src/theme/ThemeContext.jsx, owned by Foundation) — others import it
```
import { ThemeProvider, useTheme } from "./theme/ThemeContext.jsx"   // ThemeProvider wraps <App/> in main.jsx (inside AuthProvider)
const { mode, setMode, accent, setAccent, titleLang, setTitleLang, ACCENTS } = useTheme()
// mode: "dark"|"light"; accent: "pink"|"purple"|"blue"|"green"|"orange"; titleLang: "english"|"romanized"|"native"
```
Persistence: localStorage keys `jellosanime-mode`, `jellosanime-accent`, `jellosanime-titlelang` (try/catch). Pre-paint inline script in index.html sets
data-theme/data-accent (dark default; do NOT follow prefers-color-scheme unless nothing is saved AND the device prefers light — default is dark otherwise).
When a user is logged in: after login load their `profiles` row (accent, mode, title_lang) and apply it; on every change upsert/update their profile row
(debounced 500ms, errors ignored silently). If the profiles table does not exist yet (Supabase SQL not applied) everything must still work with localStorage only.
`src/titles.js` (Foundation): `export function displayTitle(anime, lang)`: english -> `anime.titleEnglish || anime.title`; romanized -> `anime.title`;
native -> `anime.titleNative || anime.titleJapanese || anime.title`. Every place that shows a title must use it with `useTheme().titleLang`.

## Database contract (Supabase; SQL file supabase/migrations/20261104_profiles_comments.sql, owned by Back-end agent)
- `public.profiles`: `id uuid pk references auth.users on delete cascade`, `username text unique not null` (3-24 chars, `^[a-zA-Z0-9_]+$`), `avatar_url text`,
  `accent text default 'pink'` (check in the 5), `mode text default 'dark'` (check dark|light), `title_lang text default 'english'` (check english|romanized|native),
  `created_at`, `updated_at`. Trigger on `auth.users` insert creates the profile (username from Google name/email local part, de-duplicated with a numeric suffix;
  avatar from `raw_user_meta_data->>'avatar_url'` or `'picture'`). RLS: select for anon+authenticated; update only own row (`using` AND `with check` id = auth.uid());
  no client insert/delete.
- `public.comments`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade`, `mal_id int not null`,
  `anime_title text not null (<=200)`, `anime_image text (https only check)`, `episode int null (0..5000)`, `body text not null (1..500 after trim)`, `spoiler boolean not null default false`,
  `created_at timestamptz default now()`. Indexes `(mal_id, created_at desc)` and `(created_at desc)`. RLS: select for anon+authenticated; insert only authenticated with
  `user_id = auth.uid()`; delete own. Rate-limit trigger: max 1 comment per 10 s and 30 per hour per user (raise an exception with a friendly message).
- `public.my_list`: ADD `last_episode int not null default 0` + `update` policy (own row, using + with check) + `grant update`.
- Grants: `anon` select on profiles/comments; `authenticated` select/insert/update/delete as above only. Enable RLS on both new tables. Client reads comments with
  `supabase.from("comments").select("id,mal_id,anime_title,anime_image,episode,body,spoiler,created_at,user_id,profiles(username,avatar_url)")`.
- The SQL must be idempotent (`create table if not exists`, `drop policy if exists` before `create policy`) because the owner pastes it into the Supabase SQL editor.
  Also write docs/SUPABASE_SETUP.md (beginner click-by-click: open SQL editor, paste, run, check the tables, Google provider reminder, Site URL).

## API additions (Back-end agent; src agents code against these)
- Shared anime shape gains `titleNative` (string) in list and detail responses (AniList `title.native`). Airing items too.
- `GET /api/airing-week` -> `{ results: AiringItem[] /* next 7 days from now, sorted by airingAt, incl. titleNative */, credits:["AniList"] }`, cache 30 min,
  max ~4 AniList pages, skip adult/no-idMal. The front end groups by the visitor's local day.
- `/api/trending` is used for "Top This Week". Everything else unchanged.

## Pages / components and OWNERSHIP (disjoint file sets — do not edit another agent's files)
- FOUNDATION (F): `src/theme.css`, `src/styles.css`, `index.html`, `src/main.jsx`, `src/theme/*`, `src/titles.js`, `public/*` (icons), `public/_headers` (CSP hash if the inline script changes).
- NAV (N): `src/components/{Header,Footer,BackToTop,ThemeToggle}.jsx` (ThemeToggle may be deleted), NEW `src/components/nav/*` (CommandPalette, PaletteMenu, LanguageToggle,
  NotificationsBell, ProfileMenu, BottomNav), `src/nav.css`.
- HOME/BROWSE (H): `src/App.jsx` (routes), `src/pages/{Home,Browse,Airing,Genres}.jsx`, `src/components/{AnimeCard,AnimeRow,Spotlight,MoodChips,FilterSheet,EmptyState,ErrorState}.jsx`,
  `src/home.css`, `src/browse.css`, `src/states.css`, `src/api.js`, `src/airing.js`, `src/browseFilters.js`.
- DETAIL/COMMENTS/LOGIN (C): `src/pages/{Detail,MyList,Login}.jsx`, `src/components/{AddToListButton,Reviews,WhereToWatch,Background,Gallery,ShareButton,Tags,Trailer}.jsx`,
  NEW `src/components/{CommentsSection,CommentCard,CommentComposer,LatestComments,ContinueWatching}.jsx`, `src/apiComments.js`, `src/detail.css`, `src/login.css`, `src/comments.css`.
- BACK-END (S): `netlify/**`, `supabase/**`, `docs/SUPABASE_SETUP.md`.
Cross-file contracts: H's Home.jsx renders `<ContinueWatching />` and `<LatestComments />` (default exports from C's files, no props); N's Header/BottomNav read
`useTheme()`, `useAuth()` (src/auth/AuthContext.jsx, existing) and call `supabase.auth.signInWithOAuth({provider:"google", options:{redirectTo: window.location.origin}})` for Google sign-in.
Routes: `/` `/browse` `/airing` (H) `/genres` (H) `/anime/:id` `/my-list` `/login` (C). `/genres` lists all genres from `/api/genres` as cards linking to `/browse?genres=<id>`.

## Comments (C)
Anyone can read; only logged-in users can post (logged-out sees "Log in to comment" with a button). Composer: textarea (max 500, counter), optional episode number, "Spoiler" checkbox, Post
button; after posting the new comment appears at the top. Card: avatar (image or initial), username, "time ago" (e.g. "5 min ago"), episode tag chip ("Ep 5"), the comment as PLAIN TEXT
(no HTML, no links auto-converted), "View anime" link to `/anime/<mal_id>`. A spoiler comment is blurred (CSS blur + "Spoiler — tap to reveal") until tapped/Enter. Users can delete their own comments.
Friendly errors (rate limit, table missing -> "Comments aren't set up yet"). Latest Comments on Home: newest 6 across all anime. Never crash if the table is missing.

## Notifications bell (N)
Dropdown/sheet. Content: "Airing today from your My List" — intersect the user's My List `mal_id`s with `/api/airing-today`; show title, "Ep N", local time. Badge dot when there are items.
Logged out: "Log in to see updates". Empty: "Nothing airing from your list today." No push/email.

## Continue watching (C)
Row from `my_list` (title, image, `last_episode`), poster cards with "Ep N" and a small "+1" button that increments `last_episode` (update own row). Logged out: hide the row (Home shows a soft "Log in to save shows" card).

## Rules for everyone
- No emojis; icons from `lucide-react` (import individual icons, e.g. `import { Star } from "lucide-react"`). Score shown as `<Star className="icon" aria-hidden="true" /> 8.4`.
- Mobile first: works at 360px, no horizontal page scroll, touch targets >= 44px, bottom nav on phones (<= 768px), sticky top nav on all sizes.
- Accessible: labels, focus-visible ring, aria on menus/dialogs (Escape closes, focus returns), reduced motion respected.
- All API/user text rendered as plain React text; every href/src https-checked as before; legal-only streaming links unchanged.
- Credits stay: Footer lists Jikan, AniList, Kitsu, Wikipedia (CC BY-SA), Wikidata, TMDB with the exact TMDB notice.
- Never run git. Scratch files only in /tmp/claude-0/-home-user-jellosanime/c3bed9d2-ae44-5069-b15c-6139fc40b544/scratchpad/ with your own unique prefix.
- `npm run build` must pass. If it fails only because another agent's files are mid-edit, wait ~30s and retry (up to 3 times).
- Visual checks: Chromium at /opt/pw-browsers/chromium, playwright at /opt/node-tools/node_modules/playwright (`executablePath`, `--no-sandbox`); serve `dist` with `npx vite preview` in the background and kill it afterwards; mock `**/api/**` and Supabase REST calls with `page.route`
  (the network is blocked); screenshot at 390 and 1440 px in dark and light, LOOK at them (Read the PNG) and fix visible problems.
