// One poster card. Clicking it opens the detail page.
// Optional `episode` prop (a number) adds a small "Ep 5" pill (used by Airing Today).
// Optional `note` prop adds a short line under the meta (e.g. the air time).
import { Link } from "react-router-dom";

export default function AnimeCard({ anime, episode, note }) {
  const name = anime.titleEnglish || anime.title || "Untitled anime";
  // Only show a score when it is a real number above 0 (a plain "&&" would print a stray 0).
  const hasScore = typeof anime.score === "number" && anime.score > 0;
  const hasEpisode = typeof episode === "number" && episode > 0;
  return (
    <Link to={`/anime/${anime.malId}`} className="card" aria-label={`${name}, view details`}>
      <div className="poster">
        <img src={anime.image} alt={name} loading="lazy" />
        {hasScore && <span className="badge">★ {anime.score}</span>}
        {hasEpisode && <span className="ep-pill">Ep {episode}</span>}
      </div>
      <div className="card-title">{name}</div>
      <div className="card-meta">
        {[anime.type || anime.format, anime.year].filter(Boolean).join(" · ")}
      </div>
      {note && <div className="card-note">{note}</div>}
    </Link>
  );
}
