// One poster card. Clicking it opens the detail page.
// Optional `episode` prop (a number) adds a small "Ep 5" badge (used by Airing Today).
// Optional `note` prop adds a short caption under the meta (e.g. "9:00 PM your time").
import { Link } from "react-router-dom";
import "../home.css";

export default function AnimeCard({ anime, episode, note }) {
  const name = anime.titleEnglish || anime.title || "Untitled anime";
  // Only show a score when it is a real number above 0 (a plain "&&" would print a stray 0).
  const hasScore = typeof anime.score === "number" && anime.score > 0;
  const hasEpisode = typeof episode === "number" && episode > 0;
  return (
    <Link to={`/anime/${anime.malId}`} className="anime-card lift" aria-label={`${name}, view details`}>
      <div className="anime-art">
        {anime.image && <img src={anime.image} alt={name} loading="lazy" />}
        {hasScore && <span className="badge badge-score anime-flag-left">★ {anime.score}</span>}
        {hasEpisode && <span className="badge anime-flag-right">Ep {episode}</span>}
      </div>
      <div className="anime-title">{name}</div>
      <div className="anime-meta t-caption">
        {[anime.type || anime.format, anime.year].filter(Boolean).join(" · ")}
      </div>
      {note && <div className="anime-note t-caption">{note}</div>}
    </Link>
  );
}
