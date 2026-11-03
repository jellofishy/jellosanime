// A titled, sideways-scrolling row of anime (used on the home page).
// The page gives it the data, so every row can load and fail on its own:
//   items  = null while loading, otherwise an array
//   failed = true when the request failed
//   onRetry = function that re-runs the failed request (the "Retry" button calls it)
//   renderCard(item) = optional, to draw each card differently (Airing Today does this)
//   credit = optional small "Data from ..." line shown under the row
//   seeAllTo = optional link target for the "See all" link next to the title
// The round arrow buttons scroll by one visible width (they are hidden on touch screens).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimeCard from "./AnimeCard.jsx";
import ErrorState from "./ErrorState.jsx";
import "../home.css";

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return true; }
}

export default function AnimeRow({ title, items, failed, credit, emptyText, renderCard, onRetry, seeAllTo }) {
  const loading = !items && !failed;
  const scroller = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const hasCards = !!items && items.length > 0;

  // Work out which arrows make sense (not at the start / not at the end).
  function updateArrows() {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }
  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [hasCards]);

  // Page by the visible width (a little less so one card stays in view as a hint).
  function page(direction) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  const headingId = `row-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="anime-row" aria-labelledby={headingId}>
      <div className="row-head">
        <h2 id={headingId} className="t-h2 row-title">{title}</h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="row-see-all" aria-label={`See all ${title}`}>
            See all <ChevronRight className="icon" aria-hidden="true" />
          </Link>
        )}
      </div>
      {failed && <ErrorState variant="strip" what={title} onRetry={onRetry} />}
      {/* Grey placeholders while loading (same size as real cards, so nothing jumps) */}
      {loading && (
        <div className="row-track" aria-busy="true" aria-label={`Loading ${title}`}>
          {Array.from({ length: 7 }, (_, i) => (
            <div className="anime-card anime-card-skeleton" key={i} aria-hidden="true">
              <div className="anime-art skeleton" />
            </div>
          ))}
        </div>
      )}
      {items && items.length === 0 && (
        <p className="muted row-msg">{emptyText || `Nothing to show in ${title} right now.`}</p>
      )}
      {hasCards && (
        <div className="row-wrap fade-in">
          <button type="button" className="row-arrow row-arrow-left" aria-label={`Scroll ${title} left`}
            onClick={() => page(-1)} disabled={!canLeft}>
            <ChevronLeft className="icon" aria-hidden="true" />
          </button>
          <div className="row-track" ref={scroller} onScroll={updateArrows}>
            {items.map((a) =>
              renderCard ? renderCard(a) : <AnimeCard key={a.malId} anime={a} />
            )}
          </div>
          <button type="button" className="row-arrow row-arrow-right" aria-label={`Scroll ${title} right`}
            onClick={() => page(1)} disabled={!canRight}>
            <ChevronRight className="icon" aria-hidden="true" />
          </button>
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
