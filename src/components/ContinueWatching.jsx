// "Continue watching" row for the Home page (default export, no props),
// plus the small poster tile and the data hook that My List shares.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { supabase } from "../auth/supabaseClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { isHttps } from "../safeUrl.js";
import "../comments.css";

// True when Supabase says "that column does not exist" (the SQL isn't applied yet).
const columnMissing = (err) => Boolean(err) && (err.code === "42703" || /last_episode|column/i.test(String(err.message || "")));

// Loads the user's saved shows. `limit` = how many (undefined = all).
// Returns { items, status: loading|ok|error, hasEpisodes, bump(item), remove(item), reload }.
export function useMyList(limit) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState("loading");
  const [hasEpisodes, setHasEpisodes] = useState(true); // false when the column isn't added yet
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || !supabase) return undefined;
    let alive = true;
    setStatus("loading");
    (async () => {
      try {
        const run = (cols) => {
          let q = supabase.from("my_list").select(cols).order("created_at", { ascending: false });
          return limit ? q.limit(limit) : q;
        };
        let { data, error } = await run("mal_id,title,image,last_episode,created_at");
        let episodes = true;
        if (error && columnMissing(error)) {
          episodes = false;
          ({ data, error } = await run("mal_id,title,image,created_at"));
        }
        if (!alive) return;
        if (error) { setStatus("error"); return; }
        setHasEpisodes(episodes);
        setItems((data || []).filter((r) => r && r.mal_id != null));
        setStatus("ok");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, [user, limit, attempt]);

  // "+1": show the new number right away, undo it if the database says no.
  const bump = useCallback(async (item) => {
    const before = Number.isInteger(item.last_episode) ? item.last_episode : 0;
    const setEp = (n) => setItems((old) => (old || []).map((i) => (i.mal_id === item.mal_id ? { ...i, last_episode: n } : i)));
    setEp(before + 1);
    try {
      const { error } = await supabase.from("my_list").update({ last_episode: before + 1 }).eq("mal_id", item.mal_id);
      if (error) { setEp(before); if (columnMissing(error)) setHasEpisodes(false); }
    } catch {
      setEp(before);
    }
  }, []);

  const remove = useCallback(async (item) => {
    let snapshot = null;
    setItems((old) => { snapshot = old; return (old || []).filter((i) => i.mal_id !== item.mal_id); });
    try {
      const { error } = await supabase.from("my_list").delete().eq("mal_id", item.mal_id);
      if (error) setItems(snapshot);
    } catch {
      setItems(snapshot);
    }
  }, []);

  return { user, items, status, hasEpisodes, bump, remove, reload: () => setAttempt((n) => n + 1) };
}

// One poster tile: image + title on a dark scrim, "Ep N" chip, "+1" button, optional remove button.
export function ListPoster({ item, hasEpisodes, onBump, onRemove }) {
  const ep = Number.isInteger(item.last_episode) ? item.last_episode : 0;
  const title = item.title || "Untitled anime";
  return (
    <div className="cw-tile">
      <Link to={`/anime/${item.mal_id}`} className="cw-poster" aria-label={`${title}, view details`}>
        {isHttps(item.image) && <img src={item.image} alt="" loading="lazy" />}
        <span className="cw-scrim">
          <span className="cw-title">{title}</span>
        </span>
      </Link>
      {hasEpisodes && <span className="cw-ep">{ep === 0 ? "Not started" : `Ep ${ep}`}</span>}
      {hasEpisodes && onBump && (
        <button type="button" className="cw-plus" onClick={() => onBump(item)} aria-label={`Mark next episode watched for ${title}`}
          title="Mark next episode watched">
          <Plus className="icon" aria-hidden="true" />1
        </button>
      )}
      {onRemove && (
        <button type="button" className="cw-remove" onClick={() => onRemove(item)} aria-label={`Remove ${title} from My List`}
          title="Remove from My List">
          <X className="icon" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function ContinueWatching() {
  const { loading: authLoading } = useAuth();
  const { user, items, status, hasEpisodes, bump, reload } = useMyList(12);

  if (!supabase) return null;
  if (authLoading) return null;

  // Logged out: a soft invitation instead of the row.
  if (!user) {
    return (
      <section className="cw-section" aria-labelledby="cw-title">
        <h2 id="cw-title" className="t-h2">Continue watching</h2>
        <div className="cw-soft">
          <p>Log in to save shows and pick up where you left off</p>
          <Link to="/login" className="btn btn-primary">Log in</Link>
        </div>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="cw-section" aria-labelledby="cw-title">
        <h2 id="cw-title" className="t-h2">Continue watching</h2>
        <div className="cw-soft" role="alert">
          <p>Your list couldn't load right now.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>Retry</button>
        </div>
      </section>
    );
  }
  if (status === "loading" || !items) {
    return (
      <section className="cw-section" aria-labelledby="cw-title">
        <h2 id="cw-title" className="t-h2">Continue watching</h2>
        <div className="cw-track" aria-busy="true" aria-label="Loading your list">
          {Array.from({ length: 5 }, (_, i) => <div className="cw-tile cw-skel skeleton" key={i} aria-hidden="true" />)}
        </div>
      </section>
    );
  }
  if (items.length === 0) {
    return (
      <section className="cw-section" aria-labelledby="cw-title">
        <h2 id="cw-title" className="t-h2">Continue watching</h2>
        <div className="cw-soft">
          <p>Nothing saved yet. Tap the heart on an anime to add it here.</p>
          <Link to="/browse" className="btn btn-secondary">Browse anime</Link>
        </div>
      </section>
    );
  }
  return (
    <section className="cw-section" aria-labelledby="cw-title">
      <h2 id="cw-title" className="t-h2">Continue watching</h2>
      <div className="cw-track">
        {items.map((it) => <ListPoster key={it.mal_id} item={it} hasEpisodes={hasEpisodes} onBump={bump} />)}
      </div>
    </section>
  );
}
