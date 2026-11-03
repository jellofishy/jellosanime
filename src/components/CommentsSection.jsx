// The "Comments" block on the detail page: composer + list + "Load more".
// Never crashes if the comments table is missing: it just says so.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { commentsApi, PAGE_SIZE } from "../apiComments.js";
import CommentCard from "./CommentCard.jsx";
import CommentComposer from "./CommentComposer.jsx";
import "../comments.css";

// Props: malId, title, image. `api` is only for tests (a fake).
export default function CommentsSection({ malId, title, image, api = commentsApi }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | missing | off | error
  const [hasMore, setHasMore] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Loads the first page (also used after posting, to replace the temporary comment).
  const load = useCallback(async () => {
    const { data, error } = await api.listForAnime(malId, 0);
    if (!alive.current) return;
    if (error) { setStatus(error.kind === "missing" || error.kind === "off" ? error.kind : "error"); return; }
    setItems(data); setHasMore(data.length >= PAGE_SIZE); setStatus("ok");
  }, [api, malId]);

  useEffect(() => { setStatus("loading"); setItems([]); load(); }, [load]);

  async function loadMore() {
    setMoreBusy(true);
    const { data, error } = await api.listForAnime(malId, items.length);
    if (!alive.current) return;
    setMoreBusy(false);
    if (error) { setNotice(error.message); return; }
    setItems((old) => [...old, ...data.filter((d) => !old.some((o) => o.id === d.id))]);
    setHasMore(data.length >= PAGE_SIZE);
  }

  async function onPost({ body, episode, spoiler }) {
    // Optimistic: show it at the top right away, then refetch the real list.
    const temp = {
      id: "temp-" + Date.now(), mal_id: malId, anime_title: title, anime_image: image, episode, body, spoiler,
      created_at: new Date().toISOString(), user_id: user && user.id,
      profiles: { username: "You", avatar_url: null },
    };
    setItems((old) => [temp, ...old]);
    setStatus("ok");
    const res = await api.post({ malId, title, image, episode, body, spoiler });
    if (!alive.current) return res;
    if (res.error) { setItems((old) => old.filter((i) => i.id !== temp.id)); return res; }
    await load();
    return res;
  }

  async function onDelete(id) {
    const before = items;
    setItems((old) => old.filter((i) => i.id !== id));
    const res = await api.remove(id);
    if (res.error) { setItems(before); setNotice(res.error.message); }
    else setNotice("");
  }

  let body;
  if (status === "loading") {
    body = <div className="skeleton cm-skel" aria-busy="true" aria-label="Loading comments" />;
  } else if (status === "missing" || status === "off") {
    body = <p className="muted cm-soft">Comments aren't set up yet</p>;
  } else if (status === "error") {
    body = (
      <div className="cm-soft" role="alert">
        <p className="muted">Comments couldn't load.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setStatus("loading"); load(); }}>Retry</button>
      </div>
    );
  } else if (items.length === 0) {
    body = <p className="muted cm-soft">No comments yet. Be the first!</p>;
  } else {
    body = (
      <>
        <ul className="cm-list">
          {items.map((c) => (
            <li key={c.id}>
              <CommentCard comment={c} canDelete={Boolean(user) && c.user_id === user.id && !String(c.id).startsWith("temp-")}
                onDelete={onDelete} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button type="button" className="btn btn-secondary cm-more" onClick={loadMore} disabled={moreBusy}>
            {moreBusy ? "Loading…" : "Load more"}
          </button>
        )}
      </>
    );
  }

  return (
    <section className="detail-section cm-section" aria-labelledby="comments-title">
      <h2 id="comments-title" className="t-h2">Comments</h2>
      {status !== "missing" && status !== "off" && <CommentComposer user={user} onPost={onPost} />}
      {notice && <p className="cm-error" role="alert">{notice}</p>}
      {body}
    </section>
  );
}
