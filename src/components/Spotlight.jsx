// Big featured banner at the top of the home page (D2).
// Shows up to 5 items, one at a time. It rotates every ~7 seconds, but:
//  - it pauses while the mouse is over it or something inside has keyboard focus
//  - it never rotates by itself when the visitor prefers reduced motion
//  - the dots let the visitor choose an item
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    return <div className="spotlight skeleton" aria-busy="true" aria-label="Loading featured anime" />;
  }
  // No data (or the request failed): show nothing instead of a broken banner.
  if (list.length === 0) return null;

  const a = list[Math.min(index, list.length - 1)];
  const name = a.titleEnglish || a.title || "Untitled anime";
  const hasScore = typeof a.score === "number" && a.score > 0;
  const bg = a.banner || a.image; // banner picture if we have one, else the cover
  const genres = Array.isArray(a.genres) ? a.genres.slice(0, 3) : [];

  return (
    <section
      className="spotlight"
      aria-roledescription="carousel"
      aria-label="Featured anime"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {bg && <img className="spotlight-bg" src={bg} alt="" />}
      <div className="spotlight-shade" />
      <div className="spotlight-body">
        <p className="spotlight-label">Spotlight</p>
        <h2 className="spotlight-title">{name}</h2>
        <p className="spotlight-meta">
          {hasScore && <span className="spotlight-score">★ {a.score}</span>}
          {genres.map((g) => <span className="spotlight-genre" key={g}>{g}</span>)}
        </p>
        <Link className="btn btn-primary" to={`/anime/${a.malId}`}>View details</Link>
      </div>
      {a.image && <img className="spotlight-poster" src={a.image} alt={`${name} cover`} />}
      {list.length > 1 && (
        <div className="spotlight-dots">
          {list.map((item, i) => (
            <button
              key={item.malId}
              type="button"
              className={`dot${i === index ? " active" : ""}`}
              aria-label={`Show featured anime ${i + 1} of ${list.length}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
