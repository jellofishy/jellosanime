// Detail page for one anime (/anime/:id).
// Every field from the API can be empty, so we check before showing anything.
// All API text is shown as plain React text (safe), never as raw HTML.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAnimeDetail } from "../api.js";
import { fetchAnimeExtras } from "../apiExtras.js";
import { isHttps } from "../safeUrl.js";
import AddToListButton from "../components/AddToListButton.jsx";
import Trailer from "../components/Trailer.jsx";
import WhereToWatch from "../components/WhereToWatch.jsx";
import Reviews from "../components/Reviews.jsx";
import Background from "../components/Background.jsx";
import Gallery from "../components/Gallery.jsx";
import ShareButton from "../components/ShareButton.jsx";
import Tags from "../components/Tags.jsx";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import "../home.css";
import "../states.css";
import "../detail.css";

// Turns a possible list into a safe list.
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
// Same, but also removes repeated names (a genre and a theme can share a name).
const unique = (v) => [...new Set(list(v))];

export default function Detail() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound | error
  const [attempt, setAttempt] = useState(0); // goes up by 1 when "Try again" is pressed

  useEffect(() => {
    let cancelled = false;
    setAnime(null);
    // An id that isn't a whole number can never exist: show "not found" without calling the API.
    if (!/^\d+$/.test(String(id))) { setStatus("notfound"); return; }
    setStatus("loading");
    fetchAnimeDetail(id)
      .then((data) => {
        if (cancelled) return;
        if (data && data.anime) { setAnime(data.anime); setStatus("ok"); }
        else setStatus("error");
      })
      .catch((err) => { if (!cancelled) setStatus(err.status === 404 || err.status === 400 ? "notfound" : "error"); });
    return () => { cancelled = true; };
  }, [id, attempt]);

  // The extras (reviews, where to watch...) load SEPARATELY, so the page
  // can show right away. A failure here only affects those sections.
  const [extras, setExtras] = useState(null);
  const [extrasStatus, setExtrasStatus] = useState("loading"); // loading | ok | error
  const [extrasAttempt, setExtrasAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setExtras(null);
    if (!/^\d+$/.test(String(id))) return;
    setExtrasStatus("loading");
    fetchAnimeExtras(id)
      .then((data) => { if (!cancelled) { setExtras(data); setExtrasStatus("ok"); } })
      .catch(() => { if (!cancelled) setExtrasStatus("error"); });
    return () => { cancelled = true; };
  }, [id, extrasAttempt]);
  const retryExtras = () => setExtrasAttempt((n) => n + 1);

  // Browser tab title.
  useEffect(() => {
    if (anime) document.title = `${anime.titleEnglish || anime.title || "Anime"} | jellosanime`;
    return () => { document.title = "jellosanime"; };
  }, [anime]);

  if (status === "loading") {
    // Glass placeholder shapes that match the real page while data loads.
    return (
      <div className="detail" aria-busy="true" aria-label="Loading anime">
        <div className="detail-hero">
          <div className="detail-backdrop skeleton" />
          <div className="detail-panel glass-art">
            <div className="detail-poster skeleton" />
            <div className="detail-head">
              <div className="skeleton skeleton-line" style={{ height: 36, width: "80%" }} />
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-line" style={{ height: 44, width: 160, borderRadius: "var(--r-pill)" }} />
            </div>
          </div>
        </div>
        <div className="skeleton detail-skeleton-block" />
      </div>
    );
  }
  if (status === "notfound") {
    return (
      <EmptyState title="We couldn't find that anime" text="It may have been removed, or the link is mistyped.">
        <Link to="/browse" className="btn btn-primary">Browse anime</Link>
      </EmptyState>
    );
  }
  if (status === "error" || !anime) {
    return <ErrorState onRetry={() => setAttempt((n) => n + 1)} />;
  }

  const title = anime.titleEnglish || anime.title || "Untitled";
  const who = anime.whoItsFor || {};
  const ageLevel = ["everyone", "kids", "teens", "mature"].includes(who.ageLevel) ? who.ageLevel : "unknown";
  const tags = unique([...list(anime.genres), ...list(anime.themes), ...list(anime.demographics)]);
  const season = [anime.season, anime.year].filter(Boolean).join(" ");
  const hasScore = typeof anime.score === "number" && anime.score > 0;
  const scorePct = hasScore ? Math.min(100, Math.max(0, anime.score * 10)) : 0;

  // Key facts: only the ones that have a value are shown.
  const facts = [
    ["Type", anime.type],
    ["Episodes", anime.episodes],
    ["Status", anime.status],
    ["Season", season],
    ["Aired", anime.aired],
    ["Duration", anime.duration],
    ["Studio", list(anime.studios).join(", ")],
    ["Producers", list(anime.producers).join(", ")],
    ["Rank", anime.rank ? `#${anime.rank}` : ""],
    ["Popularity", anime.popularity > 0 ? `#${anime.popularity}` : ""],
    ["Members", anime.members > 0 ? Number(anime.members).toLocaleString("en-US") : ""],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const redditUrl = "https://www.reddit.com/search/?q=" + encodeURIComponent(title + " anime");
  const malOk = typeof anime.malUrl === "string" && anime.malUrl.startsWith("https://myanimelist.net/");

  // Backdrop picture: a real banner is only lightly blurred; a cover is blurred a lot.
  const bannerUrl = extras && isHttps(extras.banner) ? extras.banner : anime.banner || "";
  const backdrop = bannerUrl
    ? <img className="detail-backdrop-img" src={bannerUrl} alt="" />
    : anime.image && <img className="detail-backdrop-img is-cover" src={anime.image} alt="" />;

  return (
    <article className="detail fade-in">
      <div className="detail-hero">
        {/* Blurred backdrop of the banner / cover (decorative) */}
        <div className="detail-backdrop">{backdrop}</div>

        <div className="detail-panel glass-art">
          {anime.image && <img className="detail-poster" src={anime.image} alt={title} />}
          <div className="detail-head">
            <h1 className="t-h1">{title}</h1>
            {anime.titleJapanese && <p className="muted jp">{anime.titleJapanese}</p>}
            {hasScore && (
              <div className="score-row">
                <div className="score-ring" style={{ "--pct": scorePct }} role="img" aria-label={`Score ${anime.score} out of 10`}>
                  <span>{anime.score}</span>
                </div>
                <span className="t-caption muted">Average score<br />out of 10</span>
              </div>
            )}
            <div className="action-row">
              <AddToListButton anime={anime} />
              <ShareButton title={title} />
            </div>
          </div>
          {facts.length > 0 && (
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k}><dt className="t-caption">{k}</dt><dd>{String(v)}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <section className="detail-section">
        <h2 className="t-h2">Synopsis</h2>
        <p className="synopsis t-body-l">{anime.synopsis || "No synopsis available yet."}</p>
      </section>

      <section className="detail-section who-card glass" aria-labelledby="who-title">
        <h2 className="t-h2" id="who-title">Who it's for</h2>
        {/* The age badge always has a word, never only a color */}
        <p className="who-age"><span className={`age-pill age-pill-${ageLevel}`}>{who.ageLabel || "Age rating unknown"}</span></p>
        {who.summary && <p className="who-summary t-body-l">{who.summary}</p>}
        {tags.length > 0 && (
          <div className="tag-list">
            {tags.map((t) => <span className="chip chip-static" key={t}>{t}</span>)}
          </div>
        )}
        <Tags extras={extras} skip={tags} />
      </section>

      <section className="detail-section">
        <h2 className="t-h2">Trailer</h2>
        <Trailer youtubeId={anime.trailerYoutubeId} />
      </section>

      <WhereToWatch status={extrasStatus} extras={extras} onRetry={retryExtras} />
      <Reviews status={extrasStatus} extras={extras} onRetry={retryExtras} />
      <Background status={extrasStatus} extras={extras} />
      <Gallery extras={extras} title={title} />

      <p className="detail-links">
        <a className="btn btn-secondary" href={redditUrl} target="_blank" rel="noopener noreferrer">Discuss on Reddit</a>
      </p>

      <p className="muted t-caption credits">
        Data from <a className="link" href="https://anilist.co" target="_blank" rel="noreferrer noopener">AniList</a>, with extra details from <a className="link" href="https://jikan.moe" target="_blank" rel="noreferrer noopener">Jikan</a> (MyAnimeList) when available
        {malOk && <> · <a className="link" href={anime.malUrl} target="_blank" rel="noreferrer noopener">View on MyAnimeList</a></>}
      </p>
    </article>
  );
}
