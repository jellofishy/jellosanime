// "My List": anime the logged-in user saved. Row Level Security means the database
// only ever returns THIS user's rows. (The "save" button on the detail page comes in M2.)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../auth/supabaseClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import AnimeCard from "../components/AnimeCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import "../home.css";
import "../states.css";

export default function MyList() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // goes up by 1 when "Try again" is pressed

  useEffect(() => {
    if (!user || !supabase) return;
    let alive = true;
    setItems(null);
    setFailed(false);
    supabase.from("my_list").select("mal_id,title,image").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setFailed(true);
        else setItems(data || []);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [user, attempt]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) {
    return (
      <EmptyState title="Log in to see your list" text="Your saved anime are kept in your account, so they follow you to any device.">
        <Link to="/login" className="btn btn-primary">Log in</Link>
        <Link to="/browse" className="btn btn-secondary">Browse anime</Link>
      </EmptyState>
    );
  }

  return (
    <>
      <h1 className="t-h1 page-title">My List</h1>
      {failed && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {!failed && !items && (
        <div className="anime-grid" aria-busy="true" aria-label="Loading your list">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="anime-card anime-card-skeleton" key={i} aria-hidden="true">
              <div className="anime-art skeleton" />
              <div className="skeleton skeleton-line" />
            </div>
          ))}
        </div>
      )}
      {items && items.length === 0 && (
        <EmptyState title="Nothing saved yet" text="Open an anime and tap “Add to My List”. It will show up here.">
          <Link to="/browse" className="btn btn-primary">Find something to watch</Link>
        </EmptyState>
      )}
      {items && items.length > 0 && (
        <div className="anime-grid fade-in">
          {items.map((i) => (
            <AnimeCard key={i.mal_id} anime={{ malId: i.mal_id, title: i.title, image: i.image }} />
          ))}
        </div>
      )}
    </>
  );
}
