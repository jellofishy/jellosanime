// Home page: Spotlight banner, mood chips, then rows. Each row loads and fails on its own.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnimeList, fetchAiringToday, fetchTrending } from "../api.js";
import { formatAirTime, hasAired, sortByAirTime } from "../airing.js";
import AnimeRow, { AniListCredit } from "../components/AnimeRow.jsx";
import AnimeCard from "../components/AnimeCard.jsx";
import Spotlight from "../components/Spotlight.jsx";
import MoodChips from "../components/MoodChips.jsx";
import "../home.css";

// Loads a list once. Returns { items, failed }; items stays null while loading.
function useRow(loader) {
  const [state, setState] = useState({ items: null, failed: false });
  useEffect(() => {
    let alive = true; // ignore the answer if the page was left already
    loader()
      .then((data) => alive && setState({ items: Array.isArray(data.results) ? data.results : [], failed: false }))
      .catch(() => alive && setState({ items: null, failed: true }));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export default function Home() {
  const navigate = useNavigate();
  const top = useRow(() => fetchAnimeList({ kind: "top", limit: 12 }));
  const season = useRow(() => fetchAnimeList({ kind: "season", limit: 12 }));
  const trending = useRow(fetchTrending);
  const airing = useRow(fetchAiringToday);

  useEffect(() => { document.title = "jellosanime | Find your next anime"; }, []);

  // Airing Today sorted by time; "now" is read once per render pass of the data.
  const airingSorted = useMemo(() => (airing.items ? sortByAirTime(airing.items) : null), [airing.items]);

  // Spotlight uses Trending first, and Airing Today if Trending is unavailable.
  const spotlightItems = trending.items && trending.items.length ? trending.items : airing.items;
  const spotlightLoading = !trending.failed && !trending.items;

  // "Surprise me" picks from whatever Top / Trending we already loaded.
  const pool = [...(top.items || []), ...(trending.items || [])].filter((a) => a && a.malId);
  const stillLoading = !top.items && !top.failed && !trending.items && !trending.failed;
  function surprise() {
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/anime/${pick.malId}`);
  }

  // One card in the Airing Today row: episode pill + local air time.
  function airingCard(a) {
    const time = formatAirTime(a.airingAt);
    const note = hasAired(a.airingAt) ? `Aired ${time}` : time ? `${time} your time` : "";
    return <AnimeCard key={`${a.malId}-${a.episode}`} anime={a} episode={a.episode} note={note} />;
  }

  return (
    <>
      <section className="hero">
        <h1>Find your next anime</h1>
        <p>Every anime, what it's about, what fans think, and where to watch it legally.</p>
        <button type="button" className="btn btn-secondary hero-btn" onClick={surprise} disabled={pool.length === 0}>
          {stillLoading ? "Loading…" : "🎲 Surprise me"}
        </button>
      </section>

      <Spotlight items={spotlightItems} loading={spotlightLoading} />
      <MoodChips />

      <AnimeRow
        title="Airing Today"
        items={airingSorted}
        failed={airing.failed}
        emptyText="No episodes are listed for today."
        renderCard={airingCard}
        credit={<>{AniListCredit}. Times are shown in your local time.</>}
      />
      <AnimeRow title="Trending" items={trending.items} failed={trending.failed} credit={AniListCredit} />
      <AnimeRow title="Top Anime" items={top.items} failed={top.failed} credit={AniListCredit} />
      <AnimeRow title="This Season" items={season.items} failed={season.failed} credit={AniListCredit} />
    </>
  );
}
