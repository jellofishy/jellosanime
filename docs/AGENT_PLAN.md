# jellosanime: AI Agent Team Plan

The project is built by a team of AI agents. The **owner** (jellofishy) approves the PRD and
each milestone. The **Orchestrator** agent plans, hands out tasks, merges everything, and reports back.

## How the team works
1. The owner approves the PRD (`docs/PRD.md`).
2. The Orchestrator takes the next milestone and splits it into tasks.
3. Specialist agents work **in parallel**, each only in their own folder.
4. Everyone follows the **shared anime format** (`netlify/shared/animeShape.js`), so their work fits together.
5. The QA agent checks the work against the milestone's checklist.
6. The Orchestrator reports to the owner: what was built, how to run it, what to check.
7. The owner approves, then the next milestone starts.

## The agents

| Agent | Role (plain English) | Works in | Output |
|-------|----------------------|----------|--------|
| **Orchestrator** (main Claude) | Project manager. Plans, delegates, merges, reports. | whole repo | Plans, merged code, status reports |
| **Jikan Agent** | Reads Jikan docs, builds the catalog adapter | `netlify/adapters/jikan.js` | Search, top, season, details, MAL reviews |
| **AniList Agent** | Reads AniList docs, builds the airing and banner adapter | `netlify/adapters/anilist.js` | Airing Today, banners, tags, reviews, links |
| **Kitsu Agent** | Reads Kitsu docs, builds the streaming and review adapter | `netlify/adapters/kitsu.js` | Streaming links, reviews, ID mappings |
| **Knowledge Agent** | Wikipedia and Wikidata adapters | `netlify/adapters/wikipedia.js`, `wikidata.js` | Background text, ID matching |
| **TMDB Agent** | TMDB adapter, handles the secret key safely | `netlify/adapters/tmdb.js` | Extra images, providers, attribution info |
| **Back-end Agent** | Netlify Functions that combine adapters, caching, rate limits, the legal-site allowlist | `netlify/functions/`, `netlify/shared/` | `/api/...` endpoints |
| **UI/UX Designer Agent** | Defines the visual system: pale/light pink palette, typography, spacing, rounded anime-inspired look, responsive layouts, light and dark themes, component look and feel. Does NOT write app logic. | `docs/DESIGN_SYSTEM.md`, `src/theme.css` | Design system + color/font tokens for both themes |
| **Front-end Developer Agent** | Builds the pages and components in React and applies the Designer's system. | `src/` (pages, components) | Home, Browse, Detail, Login, My List, theme toggle |
| **Auth Agent** | Sets up Supabase Auth, login pages, My List storage and security rules | `src/auth/`, `supabase/` | Sign up, log in, log out, protected My List |
| **QA / Testing Agent** | Tests every page and feature against the milestone checklists; checks missing-data cases, mobile layout, and rate limits. Read-only on code. | `docs/QA_REPORT.md` | Pass/fail report per milestone |
| **Security and Deployment Agent** | Audits for exposed keys, piracy links, adult content, and login/database rules; then sets up Netlify (environment variables, build) and deploys the site, walking the owner through each step. | `docs/SECURITY_REPORT.md`, `docs/DEPLOY.md`, `netlify.toml` | Clean security report + live site |

## Rules every agent follows
- Read the **current** official docs of your API before coding.
- Return data in the shared anime format only.
- Never put secrets in code; use environment variables.
- Never add streaming links outside the allowlist.
- Stay in your own folder; ask the Orchestrator if you need a change elsewhere.
- Comment the code simply so a beginner can follow it.

## Who works on which milestone

| Milestone | Agents involved |
|-----------|-----------------|
| M2 Detail page | Jikan + Back-end + Front-end Developer + QA |
| M3 Airing Today | AniList + Back-end + Front-end Developer + QA |
| M4 Reviews | Jikan + AniList + Kitsu + Back-end + Front-end Developer + QA |
| M5 Where to watch | Kitsu + TMDB + Back-end + Front-end Developer + QA |
| M6 Extras | Knowledge + TMDB + Front-end Developer + QA |
| M7 Browse filters | Jikan + Back-end + Front-end Developer + QA |
| M7b Look and feel | UI/UX Designer + Front-end Developer + QA |
| M7c Login | Auth + Front-end Developer + QA |
| M8 Review and deploy | QA / Testing + Security and Deployment (+ Orchestrator) |

## Handoff checklist (each agent reports)
- [ ] What I built (files)
- [ ] How to test it
- [ ] What I could not verify
- [ ] Anything I need from another agent
