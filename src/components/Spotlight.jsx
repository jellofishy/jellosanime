// Big featured banner at the top of the home page (D2): "Frosted Jelly" style.
// Shows up to 5 items. All slides sit on top of each other; only the active one is visible,
// and switching crossfades them (400ms) with a small 12px drift (see home.css).
// It rotates every ~7 seconds, but:
//  - it pauses while the mouse is over it or something inside has keyboard focus
//  - it never rotates by itself when the visitor prefers reduced motion
//  - the dots let the visitor choose an item
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AddToListButton from "./AddToListButton.jsx";
import "../home.css";

const MAX_ITEMS = 5;
const ROTATE_MS = 7000;

// True when the visitor asked their device for less motion.
function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true; // if we can't tell, be gentle and don't rotate
  }
}

export default function Spotlight({ items, loading }) {
  const list = (items || []).filter((a) => a && a.malId).slice(0, MAX_ITEMS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (list.length < 2 || paused || prefersReducedMotion()) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [list.length, paused]);

  // Loading: a skeleton the same size as the banner.
  if (loading) {
    return <div className="spotlight spotlight-skeleton skeleton" aria-busy="true" aria-label="Loading featured anime" />;
  }
  // No data (or the request failed): show nothing instead of a broken banner.
  if (list.length === 0) return null;

  const current = Math.min(index, list.length - 1);

  return (
    <section
      className="spotlight-wrap fade-in"
      aria-roledescription="carousel"
      aria-label="Featured anime"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="spotlight">
        {list.map((a, i) => {
          const name = a.titleEnglish || a.title || "Untitled anime";
          const hasScore = typeof a.score === "number" && a.score > 0;
          const bg = a.banner || a.image; // banner picture if we have one, else the cover
          const genres = Array.isArray(a.genres) ? a.genres.slice(0, 3) : [];
          const active = i === current;
          return (
            <div
              key={a.malId}
              className={`spotlight-slide${active ? " is-active" : ""}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${list.length}`}
              aria-hidden={active ? undefined : "true"}
            >
              {bg && <img className="spotlight-art" src={bg} alt="" />}
              {/* The text sits on frosted glass, never directly on the artwork */}
              <div className="spotlight-card glass-art">
                <p className="t-eyebrow spotlight-eyebrow">Spotlight</p>
                <h2 className="t-h1 spotlight-title">{name}</h2>
                <div className="spotlight-meta">
                  {hasScore && <span className="badge badge-score">★ {a.score}</span>}
                  {genres.map((g) => <span className="chip chip-static" key={g}>{g}</span>)}
                </div>
                <div className="spotlight-actions">
                  <Link className="btn btn-primary" to={`/anime/${a.malId}`} tabIndex={active ? undefined : -1}>View details</Link>
                  {active && <AddToListButton anime={a} />}
                </div>
              </div>
              {a.image && <img className="spotlight-poster" src={a.image} alt={active ? `${name} cover` : ""} />}
            </div>
          );
        })}
      </div>
      {list.length > 1 && (
        <div className="spotlight-dots">
          {list.map((item, i) => (
            <button
              key={item.malId}
              type="button"
              className={`dot${i === current ? " active" : ""}`}
              aria-label={`Show featured anime ${i + 1} of ${list.length}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
