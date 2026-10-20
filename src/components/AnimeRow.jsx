// A titled, sideways-scrolling row of anime (used on the home page).
// The page gives it the data, so every row can load and fail on its own:
//   items  = null while loading, otherwise an array
//   failed = true when the request failed
//   renderCard(item) = optional, to draw each card differently (Airing Today does this)
//   credit = optional small "Data from ..." line shown under the row
import AnimeCard from "./AnimeCard.jsx";
import "../home.css";

export default function AnimeRow({ title, items, failed, credit, emptyText, renderCard }) {
  const loading = !items && !failed;
  return (
    <section className="row">
      <h2>{title}</h2>
      {failed && <p className="muted row-msg">Couldn't load {title} right now. Please try again later.</p>}
      {/* Grey shimmering placeholders while loading (same size as real cards) */}
      {loading && (
        <div className="row-scroll" aria-busy="true" aria-label={`Loading ${title}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div className="card skeleton-card" key={i} aria-hidden="true">
              <div className="poster skeleton" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      )}
      {items && items.length === 0 && (
        <p className="muted row-msg">{emptyText || `Nothing to show in ${title} right now.`}</p>
      )}
      {items && items.length > 0 && (
        <div className="row-scroll">
          {items.map((a) =>
            renderCard ? renderCard(a) : <AnimeCard key={a.malId} anime={a} />
          )}
        </div>
      )}
      {credit && <p className="credit muted">{credit}</p>}
    </section>
  );
}

// The two credit lines (plain text links).
export const AniListCredit = (
  <>Data from <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a></>
);
export const JikanCredit = (
  <>Data from <a href="https://jikan.moe" target="_blank" rel="noopener noreferrer">Jikan</a> (MyAnimeList)</>
);
