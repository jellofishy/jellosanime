// Browse / search page with filters. ALL filters live in the web address (?genres=1,22&year=2020...)
// so a link can be shared and the Back button works. Helpers are in ../browseFilters.js.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, fetchGenres } from "../api.js";
import {
  SEASONS, TYPES, STATUSES, RATINGS, SORTS, MAX_GENRES,
  parseFilters, buildQuery, countActive, toApiParams, yearOptions,
} from "../browseFilters.js";
import AnimeCard from "../components/AnimeCard.jsx";
import "../home.css";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const apiQuery = JSON.stringify(toApiParams(filters)); // changes only when something real changes
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genresFailed, setGenresFailed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // only matters on phones

  useEffect(() => {
    document.title = filters.q ? `${filters.q} | Browse | jellosanime` : "Browse | jellosanime";
  }, [filters.q]);

  // Genre list for the chips.
  useEffect(() => {
    let alive = true;
    fetchGenres()
      .then((d) => alive && setGenres(Array.isArray(d.genres) ? d.genres : []))
      .catch(() => alive && setGenresFailed(true));
    return () => { alive = false; };
  }, []);

  // Load results whenever the filters or page change.
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    fetchAnimeList(JSON.parse(apiQuery))
      .then((d) => alive && setData({ results: Array.isArray(d.results) ? d.results : [], hasNextPage: !!d.hasNextPage }))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [apiQuery]);

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
  function goToPage(p) {
    update({ page: p }, true);
    window.scrollTo({ top: 0 });
  }

  const active = countActive(filters);
  const years = yearOptions();
  const heading = filters.mood ? `Mood: ${filters.mood}` : filters.q ? `Results for "${filters.q}"` : "Browse anime";

  // A small helper to draw one dropdown.
  const select = (id, label, key, options) => (
    <div className="filter-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={filters[key]} onChange={(e) => update({ [key]: e.target.value })}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <h1>{heading}</h1>

      <button
        type="button"
        className="btn btn-ghost filters-toggle"
        aria-expanded={panelOpen}
        aria-controls="filters-panel"
        onClick={() => setPanelOpen(!panelOpen)}
      >
        Filters{active > 0 ? ` (${active})` : ""}
      </button>

      <div id="filters-panel" className={`filters-panel${panelOpen ? " open" : ""}`}>
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
                  className={`filter-chip${on ? " selected" : ""}`}
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
          {select("f-sort", "Sort by", "order_by", SORTS)}
        </div>

        <button type="button" className="btn btn-ghost" onClick={clearAll} disabled={active === 0}>
          Clear filters
        </button>
      </div>

      {error && <p className="muted">Couldn't load anime right now. Please try again.</p>}
      {!data && !error && (
        <div className="grid" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 12 }, (_, i) => (
            <div className="card skeleton-card" key={i} aria-hidden="true">
              <div className="poster skeleton" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      )}
      {data && data.results.length === 0 && (
        <p className="muted">No anime found. Try removing a filter.</p>
      )}
      {data && data.results.length > 0 && (
        <div className="grid">
          {data.results.map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </div>
      )}
      {data && (
        <div className="pager">
          <button disabled={filters.page === 1} onClick={() => goToPage(filters.page - 1)}>← Previous</button>
          <span>Page {filters.page}</span>
          <button disabled={!data.hasNextPage} onClick={() => goToPage(filters.page + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
