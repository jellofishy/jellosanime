// One poster card. Clicking it will open the detail page (step 2).
import { Link } from "react-router-dom";

export default function AnimeCard({ anime }) {
  const name = anime.titleEnglish || anime.title || "Untitled anime";
  // Only show a score when it is a real number above 0 (a plain "&&" would print a stray 0).
  const hasScore = typeof anime.score === "number" && anime.score > 0;
  return (
    <Link to={`/anime/${anime.malId}`} className="card" aria-label={`${name}, view details`}>
      <div className="poster">
        <img src={anime.image} alt={name} loading="lazy" />
        {hasScore && <span className="badge">★ {anime.score}</span>}
      </div>
      <div className="card-title">{name}</div>
      <div className="card-meta">
        {[anime.type, anime.year].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}
