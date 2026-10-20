// Detail page for one anime (/anime/:id).
// Every field from the API can be empty, so we check before showing anything.
// All API text is shown as plain React text (safe), never as raw HTML.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAnimeDetail } from "../api.js";
import AddToListButton from "../components/AddToListButton.jsx";
import Trailer from "../components/Trailer.jsx";

// Turns a possible list into a safe list.
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

export default function Detail() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound | error

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setAnime(null);
    fetchAnimeDetail(id)
      .then((data) => {
        if (cancelled) return;
        if (data && data.anime) { setAnime(data.anime); setStatus("ok"); }
        else setStatus("error");
      })
      .catch((err) => { if (!cancelled) setStatus(err.status === 404 ? "notfound" : "error"); });
    return () => { cancelled = true; };
  }, [id]);

  // Browser tab title.
  useEffect(() => {
    if (anime) document.title = `${anime.titleEnglish || anime.title || "Anime"} | jellosanime`;
    return () => { document.title = "jellosanime"; };
  }, [anime]);

  if (status === "loading") return <p className="muted">Loading…</p>;
  if (status === "notfound") {
    return <p>We couldn't find that anime. <Link to="/browse" className="link">Browse anime</Link></p>;
  }
  if (status === "error" || !anime) {
    return <p className="muted">Couldn't load this anime right now. Please try again in a moment.</p>;
  }

  const title = anime.titleEnglish || anime.title || "Untitled";
  const who = anime.whoItsFor || {};
  const ageLevel = ["everyone", "kids", "teens", "mature"].includes(who.ageLevel) ? who.ageLevel : "unknown";
  const tags = [...list(anime.genres), ...list(anime.themes), ...list(anime.demographics)];
  const season = [anime.season, anime.year].filter(Boolean).join(" ");

  // Key facts: only the ones that have a value are shown.
  const facts = [
    ["Type", anime.type],
    ["Episodes", anime.episodes],
    ["Status", anime.status],
    ["Season", season],
    ["Aired", anime.aired],
    ["Duration", anime.duration],
    ["Studio", list(anime.studios).join(", ")],
    ["Rank", anime.rank ? `#${anime.rank}` : ""],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const redditUrl = "https://www.reddit.com/search/?q=" + encodeURIComponent(title + " anime");
  const malOk = typeof anime.malUrl === "string" && anime.malUrl.startsWith("https://myanimelist.net/");

  return (
    <article className="detail">
      {/* Banner picture, or a blurred copy of the cover if there is no banner */}
      <div className="detail-banner">
        {anime.banner
          ? <img src={anime.banner} alt="" />
          : anime.image && <img className="blur" src={anime.image} alt="" />}
      </div>

      <div className="detail-top">
        {anime.image && <img className="detail-cover" src={anime.image} alt={title} />}
        <div className="detail-head">
          <h1>{title}</h1>
          {anime.titleJapanese && <p className="muted jp">{anime.titleJapanese}</p>}
          {anime.score && <p className="score">★ {anime.score}</p>}
          <AddToListButton anime={anime} />
        </div>
      </div>

      {facts.length > 0 && (
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>
          ))}
        </dl>
      )}

      {tags.length > 0 && (
        <div className="chips">
          {tags.map((t) => <span className="chip" key={t}>{t}</span>)}
        </div>
      )}

      <section className="detail-section">
        <h2>Synopsis</h2>
        <p className="synopsis">{anime.synopsis || "No synopsis available yet."}</p>
      </section>

      <section className="detail-section who-card">
        <h2>Who it's for</h2>
        <span className={`age-badge age-${ageLevel}`}>{who.ageLabel || "Age rating unknown"}</span>
        {who.summary && <p>{who.summary}</p>}
        {tags.length > 0 && (
          <div className="chips">
            {tags.map((t) => <span className="chip" key={t}>{t}</span>)}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h2>Trailer</h2>
        <Trailer youtubeId={anime.trailerYoutubeId} />
      </section>

      {/* LATER (not built yet): "Where to watch", "What fans think" and "Background" sections go here. */}

      <p>
        <a className="link" href={redditUrl} target="_blank" rel="noreferrer noopener">Discuss on Reddit</a>
      </p>

      <p className="muted small credits">
        Data from <a className="link" href="https://jikan.moe" target="_blank" rel="noreferrer noopener">Jikan</a> (MyAnimeList)
        {malOk && <> · <a className="link" href={anime.malUrl} target="_blank" rel="noreferrer noopener">View on MyAnimeList</a></>}
      </p>
    </article>
  );
}
