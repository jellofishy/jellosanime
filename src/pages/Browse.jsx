// Browse / search page with filters. ALL filters live in the web address (?genres=1,22&year=2020...)
// so a link can be shared and the Back button works. Helpers are in ../browseFilters.js.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, fetchGenres } from "../api.js";
import {
  SEASONS, TYPES, STATUSES, RATINGS, SORTS, MAX_GENRES,
  parseFilters, buildQuery, countActive, toApiParams, yearOptions,
} from "../browseFilters.js";
import AnimeCard from "../components/AnimeCard.jsx";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import FilterSheet from "../components/FilterSheet.jsx";
import "../home.css";
import "../states.css";
import "../browse.css";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The three quick sort buttons -> the order_by values the server already understands.
const QUICK_SORTS = [
  { label: "Popular", value: "popularity" },
  { label: "Score", value: "score" },
  { label: "Newest", value: "start_date" },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const apiQuery = JSON.stringify(toApiParams(filters)); // changes only when something real changes
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0); // goes up by 1 when "Try again" is pressed
  const [genres, setGenres] = useState([]);
  const [genresFailed, setGenresFailed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // only matters on phones
  const filtersButton = useRef(null);

  useEffect(() => {
    document.title = filters.q ? `${filters.q} | Browse | jellosanime` : "Browse | jellosanime";
  }, [filters.q]);

  // Genre list for the chips.
  useEffect(() => {
    let alive = true;
    fetchGenres()
      .then((d) => alive && setGenres(Array.isArray(d && d.genres) ? d.genres : []))
      .catch(() => alive && setGenresFailed(true));
    return () => { alive = false; };
  }, []);

  // Load results whenever the filters or page change (or the visitor presses "Try again").
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    fetchAnimeList(JSON.parse(apiQuery))
      .then((d) => alive && setData({ results: Array.isArray(d && d.results) ? d.results : [], hasNextPage: !!(d && d.hasNextPage) }))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [apiQuery, attempt]);

  // Change some filters. Any change goes back to page 1 (unless we are only changing the page).
  function update(changes, keepPage = false) {
    const next = { ...filters, ...changes };
    if (!keepPage) next.page = 1;
    setParams(buildQuery(next));
  }
  function toggleGenre(id) {
    const id2 = String(id);
    const has = filters.genres.includes(id2);
    if (!has && filters.genres.length >= MAX_GENRES) return; // server allows 5 at most
    update({ genres: has ? filters.genres.filter((g) => g !== id2) : [...filters.genres, id2], mood: "" });
  }
  function clearAll() {
    setParams(buildQuery({ q: filters.q, genres: [], page: 1 })); // keeps the search words
  }
  function clearSearch() {
    setParams(""); // back to plain /browse
  }
  function goToPage(p) {
    update({ page: p }, true);
    window.scrollTo({ top: 0 });
  }
  // Pressing a quick sort again turns it off (goes back to the default order).
  function pickSort(value) {
    update({ order_by: filters.order_by === value ? "" : value, sort: "" });
  }

  const active = countActive(filters);
  const years = yearOptions();
  const heading = filters.mood ? `Mood: ${filters.mood}` : filters.q ? `Results for "${filters.q}"` : "Browse anime";
  // If the address asks for Title/Rank sorting, show that as a 4th button so something is always lit.
  const extraSort = SORTS.find((s) => s.value === filters.order_by && !QUICK_SORTS.some((q) => q.value === s.value));
  const sorts = extraSort ? [...QUICK_SORTS, { label: extraSort.label, value: extraSort.value }] : QUICK_SORTS;

  // A small helper to draw one dropdown.
  const select = (id, label, key, options) => (
    <div className="filter-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select id={id} className="field-input" value={filters[key]} onChange={(e) => update({ [key]: e.target.value })}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  function closePanel() { setPanelOpen(false); }

  return (
    <>
      <h1 className="t-h1 browse-title">{heading}</h1>

      <div className="browse-toolbar">
        <div className="segmented" role="group" aria-label="Sort by">
          {sorts.map((s) => (
            <button key={s.value} type="button" className="segment" aria-pressed={filters.order_by === s.value}
              onClick={() => pickSort(s.value)}>{s.label}</button>
          ))}
        </div>
        <button
          ref={filtersButton}
          type="button"
          className="btn btn-secondary filters-toggle"
          aria-expanded={panelOpen}
          aria-controls="filters-panel"
          onClick={() => setPanelOpen(true)}
        >
          Filters{active > 0 ? ` (${active})` : ""}
        </button>
      </div>

      <div className="browse-layout">
        <FilterSheet id="filters-panel" open={panelOpen} onClose={closePanel} title="Filters">
          <fieldset className="filter-genres">
            <legend>Genres (pick up to {MAX_GENRES})</legend>
            {genresFailed && <p className="muted">Couldn't load genres right now.</p>}
            <div className="chip-wrap">
              {genres.map((g) => {
                const on = filters.genres.includes(String(g.id));
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`chip${on ? " chip-active" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleGenre(g.id)}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="filter-selects">
            {select("f-year", "Year", "year", years.map((y) => ({ value: String(y), label: String(y) })))}
            {select("f-season", "Season", "season", SEASONS.map((s) => ({ value: s, label: cap(s) })))}
            {select("f-type", "Type", "type", TYPES.map((t) => ({ value: t, label: t === "tv" ? "TV" : t === "ova" || t === "ona" ? t.toUpperCase() : cap(t) })))}
            {select("f-status", "Status", "status", STATUSES.map((s) => ({ value: s, label: s === "complete" ? "Finished" : cap(s) })))}
            {select("f-rating", "Age rating", "rating", RATINGS)}
            {select("f-sort", "Sort by (all options)", "order_by", SORTS)}
          </div>

          <button type="button" className="btn btn-secondary filter-clear" onClick={clearAll} disabled={active === 0}>
            Clear filters
          </button>
        </FilterSheet>

        <div className="browse-results">
          {error && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
          {!data && !error && (
            <div className="anime-grid" aria-busy="true" aria-label="Loading results">
              {Array.from({ length: 12 }, (_, i) => (
                <div className="anime-card anime-card-skeleton" key={i} aria-hidden="true">
                  <div className="anime-art skeleton" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line short" />
                </div>
              ))}
            </div>
          )}
          {data && data.results.length === 0 && (
            <EmptyState
              title={filters.q ? `No anime matches “${filters.q}”` : "No anime matches these filters"}
              text="Or loosen a filter."
            >
              {active > 0 && <button type="button" className="btn btn-primary" onClick={clearAll}>Clear filters</button>}
              {active === 0 && filters.q && <button type="button" className="btn btn-primary" onClick={clearSearch}>Clear search</button>}
            </EmptyState>
          )}
          {data && data.results.length > 0 && (
            <div className="anime-grid fade-in">
              {data.results.map((a) => <AnimeCard key={a.malId} anime={a} />)}
            </div>
          )}
          {data && (data.results.length > 0 || filters.page > 1) && (
            <div className="pager">
              <button type="button" className="btn btn-secondary" disabled={filters.page === 1} onClick={() => goToPage(filters.page - 1)}>← Previous</button>
              <span className="pager-page">Page {filters.page}</span>
              <button type="button" className="btn btn-secondary" disabled={!data.hasNextPage} onClick={() => goToPage(filters.page + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
