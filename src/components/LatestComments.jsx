// "Latest Comments" for the Home page (default export, no props):
// the 6 newest comments across all anime.
import { useEffect, useState } from "react";
import { commentsApi } from "../apiComments.js";
import CommentCard from "./CommentCard.jsx";
import "../comments.css";

// `api` is only for tests.
export default function LatestComments({ api = commentsApi }) {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | hidden | error

  useEffect(() => {
    let alive = true;
    api.listLatest(6).then(({ data, error }) => {
      if (!alive) return;
      if (error) setStatus(error.kind === "missing" || error.kind === "off" ? "hidden" : "error");
      else { setItems(data); setStatus("ok"); }
    });
    return () => { alive = false; };
  }, [api]);

  // Table missing / comments switched off: the section quietly disappears.
  if (status === "hidden") return null;

  let body;
  if (status === "loading") {
    body = (
      <div className="cm-latest" aria-busy="true" aria-label="Loading comments">
        {Array.from({ length: 3 }, (_, i) => <div className="skeleton cm-skel" key={i} aria-hidden="true" />)}
      </div>
    );
  } else if (status === "error") {
    body = <p className="muted cm-soft">Latest comments couldn't load right now.</p>;
  } else if (!items || items.length === 0) {
    body = <p className="muted cm-soft">No comments yet. Be the first on an anime page.</p>;
  } else {
    body = (
      <ul className="cm-latest cm-list">
        {items.map((c) => <li key={c.id}><CommentCard comment={c} showAnime /></li>)}
      </ul>
    );
  }
  return (
    <section className="cm-section cm-home" aria-labelledby="latest-comments-title">
      <h2 id="latest-comments-title" className="t-h2">Latest Comments</h2>
      {body}
    </section>
  );
}
