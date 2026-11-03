# Frosted Jelly: the jellosanime design (from Claude Design)

This is the OWNER-APPROVED look. Source export: `docs/design/frosted-jelly-export.html` (open it in a browser to see the visual boards;
it has 3 pages: design system, states (light), states (dark)). The text below is that design's spec, copied exactly, followed by a
**token contract** that every front-end agent must follow so the work fits together. Where this document and the older
`docs/DESIGN_SYSTEM.md` disagree, THIS document wins.

## Token contract (names are binding)
`src/theme.css` (owned by Agent A) defines these CSS variables. Light is `:root`; dark is `:root[data-theme="dark"]`.
- Colors: `--bg` (base/plum), `--text` (ink/moon), `--muted` (ink soft/moon soft), `--accent` (pink), `--accent2` (lavender), `--accent-contrast`
  (text on accent buttons), `--glow-1..4` (mesh colors), `--accent-gradient` (135deg, only for buttons, active tabs, score badges)
- Mesh: `--mesh` = the 4-radial-glow `background-image` used on `body` with `background-attachment: fixed` (does not scroll)
- Glass (one set per recipe, `card | bar | art | sheet`): `--glass-<name>-bg`, `--glass-<name>-blur` (e.g. `20px`), `--glass-<name>-border` (full border color), plus
  `--glass-saturate: 160%`, `--shadow-glass`, `--shadow-glass-hover`
- Radii: `--r-xs: 8px; --r-sm: 14px; --r-md: 20px; --r-lg: 24px; --r-xl: 28px; --r-pill: 999px`
- Spacing: `--s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px; --s-9: 96px`
- Motion: `--ease: cubic-bezier(0.2, 0.8, 0.2, 1); --t-press: 120ms; --t-hover: 200ms; --t-panel: 280ms; --t-sheet: 400ms`
- Fonts: `--font-display` (Fredoka), `--font-body` (Nunito)
- Age badges: `--age-everyone-bg/--age-everyone-fg`, `--age-kids-*`, `--age-teens-*`, `--age-mature-*`, `--age-unknown-*`
- Utility classes defined ONCE in `src/theme.css` and used by everyone: `.glass` (card recipe), `.glass-bar`, `.glass-art`, `.glass-sheet`,
  `.btn` (+ `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-lg`), `.chip` (+ `.chip-active`), `.badge`, `.skeleton`, `.shimmer`, `.sr-only`, `.visually-hidden`,
  `.lift` (hover lift 4px / press 0.98), `.container`. Fallback: `@supports not (backdrop-filter: blur(1px))` raises fill opacity to 0.92.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` removes shimmer, auto-advance, lift/scale; transitions become 120ms opacity fades.

---

# DESIGN SPEC (verbatim from the design export)

## Design system board
jellosanime
Frosted Jelly
design system

Glass panels floating on soft color mesh. Cover art is the star; the UI is a clear, readable layer on top. Every text pairing on this sheet meets WCAG AA (4.5:1 body, 3:1 large).

v1.0 · Nov 2026
Web 1440 · Phone 390
Light default · Dark
01 · Color
Light mode
Aa
Base
#FFF5F8
Page ground
Aa
Ink
#3A2A38
Text · 13.1:1 on base
Aa
Ink soft
#6B5668
Meta text · 6.4:1
Aa
Pink
#C2185B
Accent · links · 5.6:1
Aa
Lavender
#6D4AE0
Secondary · focus
Aa
Blush glow
#FFD3E4
Mesh
Aa
Peach glow
#FFE2D1
Mesh
Aa
Sky glow
#D6EBFF
Mesh
Accent gradient · 135° · buttons, active tabs, score badges only
Mesh background · 4 radial glows on base · fixed, does not scroll
Dark mode
Aa
Plum
#1A1322
Page ground
Aa
Moon
#F7ECF3
Text · 15.6:1
Aa
Moon soft
#CDB9CF
Meta text · 10:1
Aa
Pink
#FF8FBB
Accent · 8.4:1
Aa
Lavender
#BBA6FF
Secondary · focus
Aa
Magenta glow
#7A1E52
Mesh
Aa
Indigo glow
#3B2A9A
Mesh
Aa
Glass plum
#2C1E3A
Glass @ 55%
Accent gradient · 135° · buttons, active tabs, score badges only
Mesh background · 4 radial glows on base · fixed, does not scroll
Everyone · #0B5E48 on #D9F5EA · 6.9:1
Kids · #174E9C on #DDEBFF · 6.8:1
Teens · #7A3F00 on #FFE9C7 · 7.4:1
Mature · #FFFFFF on #8E1037 · 8.6:1

Age badges always carry a word, never color alone, and step from light (Everyone) to darkest (Mature) so they still read apart in grayscale.

02 · Type
Display
Fredoka 700 · 80/0.98 · -2%
Find your next anime
H1
Fredoka 700 · 48/1.05 · -1%
Moonlit Courier
H2 · section
Fredoka 600 · 32/1.15
Airing Today
H3 · card title
Fredoka 600 · 22/1.25
Who it’s for
Body L
Nunito 400 · 18/1.65
A shy courier delivers letters between the living and the moon.
Body
Nunito 400 · 16/1.6
Every anime, what it’s about, what fans think, and where to watch it legally.
Label
Nunito 800 · 15/1.3
View details · Log in · Browse
Caption
Nunito 600 · 13/1.35
TV · 12 eps · Fall 2026 · 9:00 PM your time
Eyebrow
Nunito 800 · 12/1.2 · +8% caps
SPOTLIGHT

Fredoka (rounded, friendly) for display and headings. Nunito for everything you read. Phone scales Display to 44, H1 to 32, H2 to 24; body stays 16.

03 · Spacing
4
icon ↔ label
8
chip gaps
12
card inner
16
phone gutter · card gaps
24
panel padding
32
desktop gutter
48
between rows
64
section breaks
96
footer top
04 · Radii & elevation
xs · 8px
source badges
sm · 14px
inputs, thumbs
md · 20px
posters, cards
lg · 24px
panels, top bar
xl · 28px
hero, sheets
pill · 999px
buttons, chips
05 · Glass recipes
Card
fill white 56%
blur 20px · saturate 160%
border 1px white 75%
Panels, review cards, filters
Bar
fill white 68%
blur 28px · saturate 160%
border 1px white 80%
Top bar, tab bar
Over art
fill white 76%
blur 24px · saturate 160%
border 1px white 85%
Text on banners
Sheet
fill white 86%
blur 32px · saturate 160%
border 1px white 90%
Bottom sheet, modal, login
Card
fill plum 55%
blur 20px · saturate 160%
border 1px white 12%
Panels, review cards, filters
Bar
fill deep plum 66%
blur 28px · saturate 160%
border 1px white 12%
Top bar, tab bar
Over art
fill plum 66%
blur 24px · saturate 160%
border 1px white 14%
Text on banners
Sheet
fill deep plum 86%
blur 32px · saturate 160%
border 1px white 14%
Bottom sheet, modal, login

Shadow (light): 0 10px 36px rgba(194,24,91,0.12), 0 2px 6px rgba(58,42,56,0.06). Shadow (dark): 0 12px 40px rgba(0,0,0,0.45) + 0 0 0 1px rgba(255,143,187,0.06). Fallback without backdrop-filter: raise fill opacity to 0.92. Text never sits directly on artwork: always on Over-art glass or a 70% scrim.

06 · Components
Light (default)
BUTTONS
View details
Secondary
Text link
Surprise me
Focus state
Disabled
Small
Heights 36 / 48 / 56 · pill radius · min touch target 44
CHIPS
Cozy
Action-packed
Mind-bending
Drama
Sci-Fi
BADGES
8.4
Ep 5
9:00 PM your time
MyAnimeList
AniList
Kitsu
Everyone
Kids
Teens 13+
Mature 17+
INPUTS
/
Email
Year
2026
Focus: 2px accent border + 3px soft ring + a one-time glass shimmer sweep
POSTER CARD · ROW CARD
7.8
Ep 5
Starlight Bakery Club
TV · 8:00 PM your time
Tidecaller
2026 · TV · Fantasy
Hover · lift 4px, shadow grows, art scales 1.03
Press · scale 0.98
NAVIGATION
jellosanime
Browse
Log in
Popular
Score
Newest
Carousel dots
Dark
BUTTONS
View details
Secondary
Text link
Surprise me
Focus state
Disabled
Small
Heights 36 / 48 / 56 · pill radius · min touch target 44
CHIPS
Cozy
Action-packed
Mind-bending
Drama
Sci-Fi
BADGES
8.4
Ep 5
9:00 PM your time
MyAnimeList
AniList
Kitsu
Everyone
Kids
Teens 13+
Mature 17+
INPUTS
/
Email
Year
2026
Focus: 2px accent border + 3px soft ring + a one-time glass shimmer sweep
POSTER CARD · ROW CARD
7.8
Ep 5
Starlight Bakery Club
TV · 8:00 PM your time
Tidecaller
2026 · TV · Fantasy
Hover · lift 4px, shadow grows, art scales 1.03
Press · scale 0.98
NAVIGATION
jellosanime
Browse
Log in
Popular
Score
Newest
Carousel dots
07 · Motion
Easing
Standard cubic-bezier(0.2, 0.8, 0.2, 1). Durations: 120ms press, 200ms hover, 280ms panels, 400ms sheets & hero crossfade.
Hover lift
Cards rise 4px, shadow grows 10→20px blur, cover art scales to 1.03 inside its clip. Buttons brighten 6% and lift 1px.
Glass shimmer
On focus or first reveal, a 30° white highlight (12% opacity) sweeps once across the glass in 700ms. Never loops.
Carousels
Rows scroll-snap per card with momentum; arrow buttons page by visible width. Spotlight auto-advances every 7s, crossfade + 12px drift, pauses on hover/focus.
Skeletons
Glass blocks in final shapes with a soft pink-to-lavender sheen moving left→right every 1.4s. Swap to content with a 200ms fade, no layout shift.
Sheets & modals
Bottom sheet springs up from 100% (400ms), scrim fades to 40%. Drag handle dismisses past 30% height.
Reduced motion
prefers-reduced-motion: no shimmer, no auto-advance, no lift or scale; transitions become 120ms opacity fades. Skeleton sheen becomes a static tint.
08 · App icon
j
j
j
j

A glossy jelly drop holding a rounded "j", with one sparkle. 1024 master, iOS squircle mask, Android adaptive (drop as foreground, gradient as background). At 32px and below the drop is dropped and only the "j" on gradient remains, for legibility as a favicon.

## States board (light; dark is identical in layout)
States
Loading skeletons
Same sizes as the real cards so nothing jumps. A pink→lavender sheen sweeps every 1.4s (static under reduced motion).
Error
Couldn’t load right now, try again

Our anime data source didn’t answer in time. Your list and filters are safe.

Try again
Go home
Trending couldn’t load.
Retry
Full card for pages, inline strip for a single row.
No legal link known yet
Where to watch
No legal streaming link known yet
We only list official services. When one is confirmed for your region, it will appear here.
Notify me
Suggest a legal source
Never a dead end, never an unofficial link.
No results
No anime matches “moonlit curier”

Did you mean Moonlit Courier? Or loosen a filter.

Fall 2026
Movie