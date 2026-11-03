// Bell: "Airing today from your My List".
// Compares the shows in your My List with today's airing schedule. Never crashes if either fails.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../../auth/AuthContext.jsx";
import { supabase, loginEnabled } from "../../auth/supabaseClient.js";
import { useTheme } from "../../theme/ThemeContext.jsx";
import { displayTitle } from "../../titles.js";
import useDismiss from "./useDismiss.js";

// "14:30" style local time (empty text if the value is bad).
function localTime(seconds) {
  const d = new Date(Number(seconds) * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Pure helper (easy to test): keep only airing items that are in the user's list, soonest first.
export function matchList(listRows, airing) {
  const ids = new Map();
  (Array.isArray(listRows) ? listRows : []).forEach((r) => ids.set(Number(r.mal_id), r));
  return (Array.isArray(airing) ? airing : [])
    .filter((a) => a && ids.has(Number(a.malId)))
    .map((a) => ({ ...a, stored: ids.get(Number(a.malId)) }))
    .sort((a, b) => (a.airingAt || 0) - (b.airingAt || 0));
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const { titleLang } = useTheme();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrapRef);

  const userId = user ? user.id : null;
  useEffect(() => {
    setItems([]);
    if (!userId || !supabase) { setStatus("idle"); return; }
    let stop = false;
    setStatus("loading");
    (async () => {
      try {
        const [listRes, apiRes] = await Promise.all([
          supabase.from("my_list").select("mal_id,title,image"),
          fetch("/api/airing-today").then((r) => (r.ok ? r.json() : Promise.reject(new Error("api")))),
        ]);
        if (listRes.error) throw listRes.error;
        if (stop) return;
        setItems(matchList(listRes.data, apiRes && apiRes.results));
        setStatus("ok");
      } catch (e) {
        if (!stop) setStatus("error");
      }
    })();
    return () => { stop = true; };
  }, [userId]);

  const loggedIn = Boolean(user) && loginEnabled;
  const hasItems = items.length > 0;

  return (
    <div className="nv-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        data-nv-trigger
        className="nv-icon-btn nv-bell"
        aria-label={hasItems ? `Notifications, ${items.length} airing today` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="icon" aria-hidden="true" />
        {hasItems && <span className="nv-dot" aria-hidden="true" />}
      </button>
      {open && (
        <>
          <div className="nv-scrim" onClick={close} />
          <div className="nv-panel" role="dialog" aria-label="Notifications">
            <p className="nv-panel-title">Airing today from your My List</p>
            {!loggedIn && (
              <div className="nv-note">
                <p>Log in to see updates.</p>
                <Link to="/login" className="btn btn-primary btn-sm" onClick={close}>Log in</Link>
              </div>
            )}
            {loggedIn && status === "loading" && <p className="nv-note">Checking today's schedule...</p>}
            {loggedIn && status === "error" && (
              <p className="nv-note">Couldn't check updates right now. Try again later.</p>
            )}
            {loggedIn && status === "ok" && !hasItems && (
              <p className="nv-note">Nothing airing from your list today.</p>
            )}
            {loggedIn && hasItems && (
              <ul className="nv-list">
                {items.map((a) => (
                  <li key={`${a.malId}-${a.episode}`}>
                    <Link to={`/anime/${a.malId}`} className="nv-row nv-notice" onClick={close}>
                      <span className="nv-notice-title">
                        {displayTitle(a, titleLang) || a.stored.title}
                      </span>
                      <span className="badge">Ep {a.episode}</span>
                      <span className="nv-time">{localTime(a.airingAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
