# jellosanime Design System

Written by the UI/UX Designer Agent. This is the "style rulebook" for the site. The real color and size values live in `src/theme.css` (called "design tokens": named variables like `--accent`). The Front-end Developer uses those names instead of typing colors by hand, so changing the look later means changing one file.

## 1. Mood and personality

Think "a soft pastel sticker book": cute, calm, clean and friendly. Lots of white space, round corners on everything, gentle shadows tinted pink, and small playful touches (a little bounce when you hover a card, a heart that pops). It should never feel loud or cluttered. The default look is **light pale pink**. A **dark theme** has the same shapes and personality but uses deep plum-purple "night" colors so it is easy on the eyes.

## 2. Colors

Hex values are exactly what is in `src/theme.css`.

| Token | Light (default) | Dark | Used for |
|---|---|---|---|
| `--bg` | #FFF5F8 | #1A1322 | Page background |
| `--panel` | #FFFFFF | #261C31 | Cards, header, forms |
| `--panel-2` | #FFE9F0 | #32253F | Chips, hover fill, skeleton base |
| `--text` | #3A2A38 | #F8EBF3 | Main text |
| `--muted` | #6F5368 | #C9B0C4 | Secondary text, meta info |
| `--accent` | #C2185B | #FF8FBB | Main pink: links, primary buttons, heart, logo dot |
| `--accent-contrast` | #FFFFFF | #2A0F1D | Text written ON a pink button |
| `--accent-soft` | #FFD3E2 | #4A2A40 | Selected chip, glow behind things |
| `--accent2` | #6D4AE0 | #BBA6FF | Secondary accent (lavender): second buttons, focus ring |
| `--accent2-contrast` | #FFFFFF | #1A1322 | Text ON a lavender button |
| `--border` | #F3C6D6 | #4A3860 | Decorative lines, card edges |
| `--border-strong` | #B0829B | #8F78AA | Input box outlines (must be easy to see) |
| `--success` | #1B7F4B | #6FDC9C | Good messages ("Saved!") |
| `--warn` | #8A5A00 | #FFC76B | Warnings |
| `--danger` | #A3122F | #FFA3B5 | Errors |
| `--star` | #8F5E00 | #FFD36B | Score star |

Age badges (fill / text):

| Badge | Light | Dark |
|---|---|---|
| Everyone | #E3F6EA / #17673C | #1E3B2B / #8FE8B2 |
| Kids | #E1F0FF / #1B568F | #1C3350 / #9CCBFF |
| Teens | #FFF0D1 / #7A4F00 | #4A3814 / #FFD58A |
| Mature | #FFDDE3 / #A3122F | #4E1D2B / #FFA3B5 |
| Unknown | #EEE8F0 / #5C4A62 | #3A2D45 / #D5C2DB |

Badges never rely on color alone: they always show a word ("Everyone", "Kids", "Teens", "Mature", "Unrated").

Also in the tokens: `--header-bg`, `--overlay`, `--hero-gradient` (pink to lavender banner), `--skeleton-a/-b`.

### Contrast check (WCAG AA = 4.5:1 for normal text, 3:1 for big text and UI parts)

Measured with a small script using the official WCAG formula.

| Pair | Light | Dark |
|---|---|---|
| Text on page background | 12.54 | 15.66 |
| Text on card | 13.39 | 14.05 |
| Text on panel-2 | 11.58 | 12.34 |
| Muted on page background | 6.32 | 9.04 |
| Muted on card | 6.75 | 8.11 |
| Muted on panel-2 | 5.84 | 7.13 |
| Accent pink (link) on background | 5.50 | 8.53 |
| Accent pink on card | 5.87 | 7.66 |
| Button text on accent | 5.87 | 8.36 |
| Lavender on background / card | 5.31 / 5.67 | 8.63 / 7.74 |
| Lavender button text | 5.67 | 8.63 |
| Success on background | 4.70 | 10.68 |
| Warn on background | 5.55 | 11.75 |
| Star on card | 5.57 | 11.43 |
| Input outline on page (needs 3:1) | 3.02 | 4.68 |
| Badges (text on fill), all five | 6.13 to 6.68 | 7.27 to 8.37 |

Everything passes AA. Body text passes even stricter AAA (7:1) in both themes. `--border` is only decoration (about 1.4:1) so never use it as the only way to show an input or button; use `--border-strong`.

## 3. Typography

Free Google Fonts pairing:
- **Fredoka** (weights 500, 600): rounded, friendly. For the logo, page titles and section headings only.
- **Nunito** (weights 400, 600, 700, 800): soft and very readable. For everything else.

Fallbacks are in the tokens: `--font-display` and `--font-body` end with `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, so the site still looks fine if the font fails to load.

Add to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Fredoka:wght@500;600&display=swap" rel="stylesheet">
```
(`display=swap` shows text immediately in the fallback font.)

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 12px | Tiny badge text (use sparingly) |
| `--text-sm` | 14px | Meta info, card subtitle |
| `--text-base` | 16px | Body (never smaller on phones) |
| `--text-lg` | 18px | Lead text, card title on desktop |
| `--text-xl` | 22px | Section headings (h2) |
| `--text-2xl` | 26 to 36px (fluid) | Page title (h1) |
| `--text-3xl` | 32 to 52px (fluid) | Home hero title |

Line height 1.55 for body, 1.2 for headings. Weights: body 400, buttons and card titles 700, headings Fredoka 600.

## 4. Spacing, corners, shadows

- **Spacing** (multiples of 4px): `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48, `-8` 64. Page side padding (`--gutter`) is 16px.
- **Corners**: `--radius-sm` 8px (inputs, small things), `--radius-md` 14px (cards, posters), `--radius-lg` 22px (hero banner, big panels), `--radius-pill` (buttons, chips, badges, search box).
- **Shadows**: `--shadow-1` (resting card), `--shadow-2` (hover, header), `--shadow-3` (popups, hero). In light mode they are pink-tinted; in dark mode plain dark.

## 5. Breakpoints and layouts (phone first)

Write CSS for a 360px-wide phone first, then add `@media (min-width: ...)` for bigger screens.

| Name | Min width | Notes |
|---|---|---|
| Phone | 0 (design at 360) | 2 poster columns, one-column pages |
| Tablet | 640px | 3 to 4 poster columns |
| Laptop | 960px | 5 to 6 columns, side-by-side detail layout |
| Wide | 1200px | Content stops growing (`--container`) |

No sideways page scrolling at 360px. Touch targets at least 44px (`--tap`).

- **Home**: Spotlight banner on top (phone: poster-style card, image above text, buttons stacked; laptop: image right, text left). Under it: mood chips in a single row that scrolls sideways on phones. Then horizontal scroll rows of cards (Trending, Top rated, etc.) with snap scrolling. "Surprise me" button sits in the hero.
- **Browse**: search and filter chips on top (chips wrap onto lines). Card grid: `repeat(auto-fill, minmax(150px, 1fr))` (2 columns at 360px). Pager buttons are big and centered.
- **Detail**: Phone is one column: banner, then poster + title, buttons (heart, share), badges, synopsis, trailer frame, extra info. Laptop (960+): poster on the left (260px), info on the right. Trailer is always full width of its column.
- **Login**: One centered card (max 380px) on the page background. On phones it fills the width minus gutters; inputs 48px tall.
- **My List**: Same card grid as Browse. When empty, show a friendly illustration-style message ("Nothing here yet. Tap the heart on any anime!") with a button to Browse.

## 6. Component specs

**Header**: Sticky, `--header-bg` with a blur, bottom border `--border`, height 60px. Logo "jellos**anime**" in Fredoka (the "anime" part in `--accent`). Phone: logo + theme toggle + menu/login icons on row one, search box full width on a second row. Laptop: all in one row, search in the middle.

**Search**: Pill shape, `--panel` fill, 1.5px `--border-strong` outline, magnifier icon inside, 44px tall. Focus: 3px `--focus-ring` outline and a soft pink glow.

**Anime card**: Poster with `--radius-md`, `--shadow-1`. Hover/focus: rises 4px and scales to 1.03 with `--shadow-2` (bounce easing). Title below in 700 weight, max 2 lines; meta line in `--muted` `--text-sm`. Score star badge on the poster corner (star in `--star` on a `--panel` pill). Heart button on the opposite corner.

**Chips (mood/genre)**: Pill, `--panel-2` fill, `--text`, 14px, padding 8px 14px, min height 40px. Selected: `--accent-soft` fill with a 2px `--accent` outline. Hover: lifts 2px.

**Buttons**: all pills, min height 44px, 700 weight.
- Primary: `--accent` fill, `--accent-contrast` text, `--shadow-1`; hover lifts 2px and gets `--shadow-2`; pressed shrinks to 0.97.
- Secondary: `--accent2` fill, `--accent2-contrast` text.
- Ghost: transparent, 1.5px `--border-strong` outline, `--text`.
- Disabled: 45% opacity, no hover movement.

**Badges**: Small pill, `--text-xs` bold, uses the age badge tokens (e.g. `background: var(--badge-teens-bg); color: var(--badge-teens-fg)`). Airing status uses the same style: "Airing" = everyone colors, "Finished" = unknown colors, "Upcoming" = kids colors.

**Who's-it-for card** (a short friendly panel on the detail page: "Great for: fans of cozy slice-of-life, ages 13+"): `--panel` fill, `--radius-lg`, 4px left stripe in `--accent2`, emoji or sparkle icon, 16px text with the age badge inside. Padding 16px phone, 24px laptop.

**Trailer frame**: 16:9 box (`aspect-ratio: 16 / 9`), `--radius-lg`, `overflow: hidden`, `--shadow-2`, `--panel-2` behind the video while it loads. Iframe fills the box. Provide a title attribute on the iframe. If there is no trailer, show a soft message instead of an empty box.

**Skeleton loaders**: Same size and corners as the thing they replace (poster 2:3, title line 14px tall at 80% width, meta line 60% width). Fill gradient between `--skeleton-a` and `--skeleton-b` that slides across in 1.4s loops. Under reduced motion they just stay a flat `--skeleton-a`. Mark the loading area `aria-busy="true"`.

**Theme toggle**: Round 44px button in the header with a sun icon (shown in dark mode, meaning "go light") and a moon icon (shown in light mode, "go dark"). Icon swaps with a quick spin/fade. `aria-label="Switch to dark theme"` / `"Switch to light theme"`, and `aria-pressed` set to whether dark is on.

**Back-to-top**: 48px round `--accent` button, bottom-right (16px from edges, above the phone's safe area). Fades and slides in after scrolling about 600px. Scrolls smoothly to top. `aria-label="Back to top"`.

**My List heart**: Heart icon button, 44px hit area. Off: outline heart in `--muted`. On: filled `--accent`, with a small pop (scale 1 to 1.3 to 1, 0.3s). `aria-pressed` true/false and a label like "Add Naruto to My List" / "Remove Naruto from My List".

## 7. Motion rules

- Short and gentle: hover/press 150 to 250ms, entrances up to 500ms. Use `--ease` (slight bounce) for fun things (cards, heart) and `--ease-soft` for color changes.
- Only animate `transform` and `opacity` (smooth on cheap phones), plus color for the theme switch.
- Nothing loops forever except skeleton shimmer.
- `prefers-reduced-motion: reduce` is already handled in `theme.css` (animations and transitions become practically instant). Do not add motion that bypasses it. Smooth scrolling (`scroll-behavior: smooth` and the back-to-top) must also be turned off for these users.

## 8. Accessibility rules

- Text contrast follows the tables above; do not invent new text/background pairs without checking 4.5:1.
- Always keep the visible focus ring (`:focus-visible` in `theme.css`). Never write `outline: none` without a replacement.
- Icon-only buttons (theme toggle, heart, share, back-to-top) need an `aria-label`.
- Every poster image has `alt` text (the anime title); decorative images use `alt=""`.
- Use real elements: `<button>` for actions, `<a>` for links, one `<h1>` per page, `<nav>`, `<main>`.
- Do not use color alone to give meaning (badges include words).
- Touch targets at least 44x44px.
- Text must stay readable when the browser zoom is 200% (use rem, no fixed-height text boxes).

## 9. Checklist for the Front-end Developer

1. In `src/main.jsx` (or `App.jsx`) add `import './theme.css'` BEFORE `import './styles.css'`. Then in `styles.css` delete its own `:root { ... }` block (theme.css owns the colors now) and replace hard-coded colors (`#25264a`, `#33345c`, `rgba(15,16,32,.92)`, `white`, `#ffd166`) with tokens (`var(--border)`, `var(--border-strong)`, `var(--header-bg)`, `var(--accent-contrast)`, `var(--star)`). Also give `body` `font-family: var(--font-body)` and headings `var(--font-display)`.
2. Add the Google Fonts link (section 3) to `index.html`.
3. **Theme toggle behaviour**:
   - The theme is the attribute `data-theme` on `<html>` (`"light"` or `"dark"`). No attribute = light.
   - Save the owner's choice in `localStorage` under a key like `jellosanime-theme`. Wrap every read and write in `try/catch` (private browsing can block storage); if it fails, just keep working with no saving.
   - **Default is LIGHT PINK.** On a visit with no saved choice, use light, EXCEPT when the device explicitly says it prefers dark (`window.matchMedia('(prefers-color-scheme: dark)').matches`); then start dark. As soon as the person presses the toggle, save their choice and from then on ignore the device setting.
   - Avoid a white flash: put a tiny inline `<script>` in `index.html` `<head>` that reads the saved value (in try/catch) and sets `document.documentElement.dataset.theme` before the page paints.
   - When switching, add class `theme-fade` to `<html>` for about 400ms so colors blend smoothly, then remove it.
   - Update `<meta name="theme-color">` to `#FFF5F8` (light) or `#1A1322` (dark).
4. Build the components in section 6 using only token variables (no raw hex in components).
5. Write layouts phone-first with the breakpoints in section 5; test at 360px, 768px and 1280px in BOTH themes.
6. Add skeletons for Home rows, Browse grid and Detail, and the empty state for My List.
7. Check keyboard Tab order and focus rings, and test with "reduce motion" turned on.
8. If a new color is needed, ask the Designer Agent to add a token to `theme.css` for both themes, with a contrast check.
