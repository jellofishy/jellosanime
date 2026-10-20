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
| **Front-end and Design Agent** | Pages, layout, anime-style dark theme, mobile design | `src/` | Home, Browse, Detail pages |
| **QA and Security Agent** | Tests every page, checks for exposed keys, rate limits, piracy links, adult content | `docs/QA_REPORT.md` | Pass/fail report per milestone |
| **DevOps Agent** | Netlify setup, environment variables, deploy steps | `netlify.toml`, deploy guide | Live site and `docs/DEPLOY.md` |

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
| M2 Detail page | Jikan + Back-end + Front-end + QA |
| M3 Airing Today | AniList + Back-end + Front-end + QA |
| M4 Reviews | Jikan + AniList + Kitsu + Back-end + Front-end + QA |
| M5 Where to watch | Kitsu + TMDB + Back-end + Front-end + QA |
| M6 Extras | Knowledge + TMDB + Front-end + QA |
| M7 Browse filters | Jikan + Back-end + Front-end + QA |
| M8 Review and deploy | QA + DevOps (+ Orchestrator) |

## Handoff checklist (each agent reports)
- [ ] What I built (files)
- [ ] How to test it
- [ ] What I could not verify
- [ ] Anything I need from another agent
