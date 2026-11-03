// One comment. All text is shown as PLAIN React text (never HTML, links are not auto-made).
// Spoiler comments are blurred until the reader taps / presses Enter or Space.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Eye } from "lucide-react";
import { isHttps } from "../safeUrl.js";
import { timeAgo } from "../apiComments.js";
import "../comments.css";

export { timeAgo };

// Round avatar: a picture when the address is https, otherwise the first letter.
function Avatar({ url, name }) {
  const [broken, setBroken] = useState(false);
  if (isHttps(url) && !broken) {
    return <img className="cm-avatar" src={url} alt={`${name} avatar`} width="40" height="40" loading="lazy"
      referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span className="cm-avatar cm-avatar-letter" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}

// Props: comment (one row from apiComments), showAnime (adds a "View anime" link),
// canDelete (true for the author), onDelete(id), now (only for tests).
export default function CommentCard({ comment, showAnime = false, canDelete = false, onDelete, now }) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = comment || {};
  const name = (c.profiles && c.profiles.username) || "Anime fan";
  const hidden = c.spoiler === true && !revealed;
  const hasEpisode = Number.isInteger(c.episode) && c.episode >= 0;

  async function remove() {
    if (!onDelete || busy) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this comment?")) return;
    setBusy(true);
    await onDelete(c.id);
    setBusy(false);
  }

  return (
    <article className="cm-card" aria-label={`Comment by ${name}`}>
      <header className="cm-head">
        <Avatar url={c.profiles && c.profiles.avatar_url} name={name} />
        <div className="cm-who">
          <span className="cm-name">{name}</span>
          <time className="cm-time" dateTime={c.created_at}>{timeAgo(c.created_at, now)}</time>
        </div>
        {hasEpisode && <span className="chip chip-static cm-chip">{`Ep ${c.episode}`}</span>}
        {c.spoiler === true && <span className="chip chip-static cm-chip cm-chip-spoiler">Spoiler</span>}
        {canDelete && (
          <button type="button" className="cm-icon-btn" onClick={remove} disabled={busy}
            aria-label="Delete my comment" title="Delete">
            <Trash2 className="icon" aria-hidden="true" />
          </button>
        )}
      </header>

      {showAnime && c.mal_id != null && (
        <p className="cm-anime">
          On <Link to={`/anime/${c.mal_id}`} className="link">{c.anime_title || "this anime"}</Link>
        </p>
      )}

      <div className="cm-body-wrap">
        <p className={"cm-body" + (hidden ? " is-blurred" : "")} aria-hidden={hidden ? "true" : undefined}>{c.body}</p>
        {hidden && (
          <button type="button" className="cm-reveal" onClick={() => setRevealed(true)}>
            <Eye className="icon" aria-hidden="true" /> Spoiler — tap to reveal
          </button>
        )}
      </div>
      {/* Screen readers hear this once the spoiler is shown */}
      <span className="sr-only" aria-live="polite">{c.spoiler === true && revealed ? "Spoiler revealed" : ""}</span>

      {showAnime && c.mal_id != null && (
        <Link to={`/anime/${c.mal_id}`} className="cm-view">View anime</Link>
      )}
    </article>
  );
}
