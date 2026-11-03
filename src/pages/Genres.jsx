// Genres page (/genres): every genre as a card that opens Browse with that genre selected.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tag, Swords, Compass, Laugh, Drama, Wand2, Ghost, Heart, Rocket, Coffee, Trophy, Search, Eye,
  Sparkles, Music, Bot, Brain, Award, UtensilsCrossed, Palette,
} from "lucide-react";
import { fetchGenres } from "../api.js";
import ErrorState from "../components/ErrorState.jsx";
import "../home.css";
import "../states.css";
import "../browse.css";

// A small icon for the well-known genres; anything else gets the neutral Tag icon.
const GENRE_ICONS = {
  action: Swords, adventure: Compass, comedy: Laugh, drama: Drama, fantasy: Wand2, horror: Ghost,
  romance: Heart, "sci-fi": Rocket, "slice of life": Coffee, sports: Trophy, mystery: Search,
  suspense: Eye, supernatural: Sparkles, music: Music, mecha: Bot, psychological: Brain,
  "award winning": Award, gourmet: UtensilsCrossed, "avant garde": Palette,
};
const iconFor = (name) => GENRE_ICONS[String(name || "").toLowerCase()] || Tag;

export default function Genres() {
  const [genres, setGenres] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { document.title = "Genres | jellosanime"; }, []);

  useEffect(() => {
    let alive = true;
    setGenres(null);
    setFailed(false);
    fetchGenres()
      .then((d) => alive && setGenres(Array.isArray(d && d.genres) ? d.genres.filter((g) => g && g.id && g.name) : []))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [attempt]);

  return (
    <>
      <h1 className="t-h1 page-title">Genres</h1>
      <p className="muted airing-intro">Pick a genre to see matching anime.</p>

      {failed && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}

      {!genres && !failed && (
        <div className="genre-grid" aria-busy="true" aria-label="Loading genres">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="genre-card skeleton" aria-hidden="true" />)}
        </div>
      )}

      {genres && genres.length === 0 && <p className="muted">No genres to show right now.</p>}
      {genres && genres.length > 0 && (
        <div className="genre-grid fade-in">
          {genres.map((g) => {
            const Icon = iconFor(g.name);
            return (
              <Link key={g.id} to={`/browse?genres=${encodeURIComponent(g.id)}`} className="genre-card lift">
                <Icon className="genre-icon" aria-hidden="true" />
                <span className="genre-name">{g.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
