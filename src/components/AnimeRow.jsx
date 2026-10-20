// A titled, sideways-scrolling row of anime (used on the home page).
// It loads its own data when it appears on screen.
import { useEffect, useState } from "react";
import { fetchAnimeList } from "../api.js";
import AnimeCard from "./AnimeCard.jsx";

export default function AnimeRow({ title, kind }) {
  const [items, setItems] = useState(null); // null = still loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAnimeList({ kind, limit: 12 })
      .then((data) => setItems(data.results))
      .catch(() => setFailed(true));
  }, [kind]);

  return (
    <section className="row">
      <h2>{title}</h2>
      {failed && <p className="muted">Couldn't load this right now.</p>}
      {/* Grey shimmering placeholders while loading (same size as real cards) */}
      {!items && !failed && (
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
      {items && (
        <div className="row-scroll">
          {items.map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </div>
      )}
    </section>
  );
}
