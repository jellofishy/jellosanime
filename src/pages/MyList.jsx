// "My List": anime the logged-in user saved. Row Level Security means the database
// only ever returns THIS user's rows. Each poster has a "+1" (episode watched) and a remove button.
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useMyList, ListPoster } from "../components/ContinueWatching.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import "../states.css";
import "../comments.css";

export default function MyList() {
  const { loading } = useAuth();
  const { user, items, status, hasEpisodes, bump, remove, reload } = useMyList();

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
      {status === "error" && <ErrorState onRetry={reload} />}
      {status === "loading" && (
        <div className="cw-grid" aria-busy="true" aria-label="Loading your list">
          {Array.from({ length: 6 }, (_, i) => <div className="cw-tile cw-skel skeleton" key={i} aria-hidden="true" />)}
        </div>
      )}
      {status === "ok" && items && items.length === 0 && (
        <EmptyState title="Nothing saved yet" text="Open an anime and tap “Add to My List”. It will show up here.">
          <Link to="/browse" className="btn btn-primary">Find something to watch</Link>
        </EmptyState>
      )}
      {status === "ok" && items && items.length > 0 && (
        <div className="cw-grid fade-in">
          {items.map((i) => (
            <ListPoster key={i.mal_id} item={i} hasEpisodes={hasEpisodes} onBump={bump} onRemove={remove} />
          ))}
        </div>
      )}
    </>
  );
}
