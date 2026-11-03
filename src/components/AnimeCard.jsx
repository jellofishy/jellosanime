// One poster card. Clicking it opens the detail page.
// The title and score sit on a dark gradient at the bottom of the poster (white text in both themes).
// Optional props:
//   episode = a number, shows a small "Ep 5" chip (Airing Today)
//   time    = text like "7:30 PM", shows a small time chip (Airing Today)
//   aired   = true when that time has passed (the time chip then reads "Aired 7:30 PM")
//   note    = any short extra line under the score (kept for other pages)
import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Clock } from "lucide-react";
import { useTheme } from "../theme/ThemeContext.jsx";
import { displayTitle } from "../titles.js";
import "../home.css";

export default function AnimeCard({ anime, episode, time, aired, note }) {
  const { titleLang } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  const name = displayTitle(anime, titleLang) || "Untitled anime";
  // Only show a score when it is a real number above 0 (a plain "&&" would print a stray 0).
  const hasScore = typeof anime.score === "number" && anime.score > 0;
  const hasEpisode = typeof episode === "number" && episode > 0;
  const info = [anime.type || anime.format, anime.year].filter(Boolean).join(" · ");
  return (
    <Link to={`/anime/${anime.malId}`} className="anime-card">
      {/* The skeleton class is the grey shimmer you see until the picture has loaded */}
      <div className="anime-art skeleton">
        {anime.image && !imgFailed && (
          <img src={anime.image} alt={name} loading="lazy" onError={() => setImgFailed(true)} />
        )}
        {/* Small chips stacked in the top-left corner so they never overlap on narrow cards */}
        {(hasEpisode || time) && (
          <div className="poster-chips">
            {hasEpisode && <span className="poster-chip">Ep {episode}</span>}
            {time && (
              <span className="poster-chip">
                <Clock className="icon" aria-hidden="true" /> {aired ? `Aired ${time}` : time}
              </span>
            )}
          </div>
        )}
        <div className="anime-scrim">
          <div className="anime-title">{name}</div>
          <div className="anime-meta">
            {hasScore && (
              <span className="anime-score"><Star className="icon" aria-hidden="true" /> {anime.score}</span>
            )}
            {info && <span className="anime-info">{info}</span>}
          </div>
          {note && <div className="anime-note">{note}</div>}
        </div>
      </div>
    </Link>
  );
}
