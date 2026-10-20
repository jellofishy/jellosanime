// One poster card. Clicking it will open the detail page (step 2).
import { Link } from "react-router-dom";

export default function AnimeCard({ anime }) {
  return (
    <Link to={`/anime/${anime.malId}`} className="card">
      <div className="poster">
        <img src={anime.image} alt={anime.title} loading="lazy" />
        {anime.score && <span className="badge">★ {anime.score}</span>}
      </div>
      <div className="card-title">{anime.titleEnglish || anime.title}</div>
      <div className="card-meta">
        {[anime.type, anime.year].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}
