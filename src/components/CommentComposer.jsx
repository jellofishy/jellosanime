// The "write a comment" box. Only for logged-in people (logged-out sees a login card).
import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import "../comments.css";

const MAX = 500;

// Props: user (null when logged out), onPost({ body, episode, spoiler }) -> { error } , disabled
export default function CommentComposer({ user, onPost, disabled = false }) {
  const [body, setBody] = useState("");
  const [episode, setEpisode] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="cm-login-card">
        <p className="cm-login-text">Log in to comment</p>
        <Link to="/login" className="btn btn-primary">Log in</Link>
      </div>
    );
  }

  const empty = body.trim().length === 0;
  const epNum = episode === "" ? null : Number(episode);
  const epBad = epNum !== null && (!Number.isInteger(epNum) || epNum < 0 || epNum > 5000);

  async function submit(e) {
    e.preventDefault();
    if (empty || busy || epBad) return;
    setBusy(true);
    setError("");
    const res = await onPost({ body: body.trim(), episode: epNum, spoiler });
    setBusy(false);
    if (res && res.error) { setError(res.error.message); return; }
    setBody(""); setEpisode(""); setSpoiler(false);
  }

  return (
    <form className="cm-composer" onSubmit={submit}>
      <label htmlFor="cm-body" className="cm-label">Add a comment</label>
      <textarea id="cm-body" className="cm-textarea" rows={3} maxLength={MAX} value={body}
        placeholder="What did you think?" onChange={(e) => setBody(e.target.value)} />
      <div className="cm-composer-row">
        <div className="cm-ep">
          <label htmlFor="cm-ep" className="cm-label">Episode (optional)</label>
          <input id="cm-ep" className="cm-input" type="number" inputMode="numeric" min="0" max="5000" step="1"
            value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="e.g. 5" />
        </div>
        <label className="cm-check">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          <span>Spoiler</span>
        </label>
        <span className="cm-counter t-caption" aria-live="polite">{body.length} / {MAX}</span>
        <button type="submit" className="btn btn-primary cm-post" disabled={empty || busy || epBad || disabled}>
          <Send className="icon" aria-hidden="true" /> {busy ? "Posting…" : "Post"}
        </button>
      </div>
      {epBad && <p className="cm-error" role="alert">Episode must be a whole number from 0 to 5000.</p>}
      {error && <p className="cm-error" role="alert">{error}</p>}
    </form>
  );
}
