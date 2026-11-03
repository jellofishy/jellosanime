// Airing page (/airing): the next 7 days of episodes, grouped by the VISITOR'S local day.
// A sticky row of day chips (Today, Tomorrow, Wed, Thu ...) picks the day; the list shows that day by time.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX, Clock } from "lucide-react";
import { fetchAiringWeek } from "../api.js";
import { formatAirTime, hasAired, groupByLocalDay } from "../airing.js";
import { useTheme } from "../theme/ThemeContext.jsx";
import { displayTitle } from "../titles.js";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import "../home.css";
import "../states.css";
import "../browse.css";

// One row: poster thumbnail, title, "Ep N", local time (and "Aired" when the time has passed).
function AiringRow({ item, nowMs }) {
  const { titleLang } = useTheme();
  const name = displayTitle(item, titleLang) || "Untitled anime";
  const aired = hasAired(item.airingAt, nowMs);
  return (
    <li>
      <Link to={`/anime/${item.malId}`} className="airing-row">
        <span className="airing-thumb skeleton">
          {item.image && <img src={item.image} alt="" loading="lazy" />}
        </span>
        <span className="airing-info">
          <span className="airing-name">{name}</span>
          <span className="airing-meta">
            {typeof item.episode === "number" && <span className="airing-ep">Ep {item.episode}</span>}
            <span className="airing-time"><Clock className="icon" aria-hidden="true" /> {formatAirTime(item.airingAt)}</span>
            {aired && <span className="airing-aired">Aired</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function Airing() {
  const [state, setState] = useState({ items: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState(0); // index of the chosen day tab
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => { document.title = "Airing this week | jellosanime"; }, []);

  useEffect(() => {
    let alive = true;
    setState({ items: null, failed: false });
    fetchAiringWeek()
      .then((d) => {
        if (!alive) return;
        setNowMs(Date.now());
        setState({ items: Array.isArray(d && d.results) ? d.results : [], failed: false });
      })
      .catch(() => alive && setState({ items: null, failed: true }));
    return () => { alive = false; };
  }, [attempt]);

  const days = useMemo(() => groupByLocalDay(state.items || [], nowMs), [state.items, nowMs]);
  const day = days[Math.min(picked, days.length - 1)];
  const loading = !state.items && !state.failed;

  return (
    <>
      <h1 className="t-h1 page-title">Airing this week</h1>
      <p className="muted airing-intro">New episodes, shown in your local time.</p>

      <nav className="day-tabs" aria-label="Choose a day">
        {days.map((d, i) => (
          <button
            key={d.key}
            type="button"
            className={`chip day-chip${i === picked ? " chip-active" : ""}`}
            aria-pressed={i === picked}
            onClick={() => setPicked(i)}
          >
            {d.label}
            {i > 1 && <span className="day-chip-sub"> {d.sub}</span>}
          </button>
        ))}
      </nav>

      {state.failed && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}

      {loading && (
        <ul className="airing-list" aria-busy="true" aria-label="Loading schedule">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="airing-row airing-row-skeleton" aria-hidden="true">
              <span className="airing-thumb skeleton" />
              <span className="airing-info">
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line short" />
              </span>
            </li>
          ))}
        </ul>
      )}

      {state.items && day && day.items.length === 0 && (
        <EmptyState icon={CalendarX} title="Nothing scheduled this day" text="Try another day from the tabs above." />
      )}
      {state.items && day && day.items.length > 0 && (
        <ul className="airing-list fade-in">
          {day.items.map((a) => <AiringRow key={`${a.malId}-${a.episode}-${a.airingAt}`} item={a} nowMs={nowMs} />)}
        </ul>
      )}

      <p className="credit muted">
        Schedule data from <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>
      </p>
    </>
  );
}
