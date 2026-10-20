// "What fans think": a summary plus review cards (excerpts only, never the full text).
import { isHttps, asArray } from "../safeUrl.js";
import "../detail.css";

const SOURCE_NAMES = { mal: "MyAnimeList", anilist: "AniList", kitsu: "Kitsu" };

// Turns a date string into e.g. "Mar 4, 2023". If it can't be read, shows it as-is.
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function ReviewCard({ r }) {
  const source = SOURCE_NAMES[r.source] || "Review";
  return (
    <li className="review-card">
      <div className="review-top">
        <span className="source-badge">{source}</span>
        {r.author && <span className="review-author">{r.author}</span>}
        {typeof r.score === "number" && <span className="review-score">★ {r.score}</span>}
        {r.recommended === true && <span className="pill pill-good">Recommended</span>}
        {r.recommended === false && <span className="pill pill-bad">Not recommended</span>}
      </div>
      <p className="review-text">{r.excerpt}</p>
      <div className="review-bottom small">
        {r.date && <span className="muted">{formatDate(r.date)}</span>}
        {isHttps(r.url) && (
          <a className="link" href={r.url} target="_blank" rel="noopener noreferrer">Read full review</a>
        )}
      </div>
    </li>
  );
}

export default function Reviews({ status, extras }) {
  let body;
  if (status === "loading") {
    body = <div className="skeleton x-skel" aria-busy="true" aria-label="Loading reviews" />;
  } else if (status === "error" || !extras) {
    body = <p className="muted">Couldn't load reviews right now.</p>;
  } else {
    const reviews = asArray(extras.reviews).filter((r) => r && r.excerpt);
    const s = extras.reviewSummary || {};
    body = reviews.length === 0 ? <p className="muted">No reviews found yet.</p> : (
      <>
        <p className="review-summary">
          {typeof s.averageScore === "number" && <strong>★ {s.averageScore} average · </strong>}
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          {(s.recommended > 0 || s.notRecommended > 0) &&
            ` · ${s.recommended || 0} recommended, ${s.notRecommended || 0} not recommended`}
        </p>
        <ul className="review-list">
          {reviews.map((r, i) => <ReviewCard key={i} r={r} />)}
        </ul>
      </>
    );
  }
  return (
    <section className="detail-section" aria-labelledby="reviews-title">
      <h2 id="reviews-title">What fans think</h2>
      {body}
      <p className="muted small">
        Reviews from MyAnimeList (via <a className="link" href="https://jikan.moe" target="_blank" rel="noopener noreferrer">Jikan</a>
        ), <a className="link" href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a> and{" "}
        <a className="link" href="https://kitsu.app" target="_blank" rel="noopener noreferrer">Kitsu</a>.
      </p>
    </section>
  );
}
