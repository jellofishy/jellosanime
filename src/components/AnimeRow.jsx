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
      {!items && !failed && <p className="muted">Loading…</p>}
      {items && (
        <div className="row-scroll">
          {items.map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </div>
      )}
    </section>
  );
}
