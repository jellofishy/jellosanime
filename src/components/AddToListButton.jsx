// "Add to My List" / "Remove from My List" button.
// It saves a row in the Supabase `my_list` table (user_id is filled in by the database).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../auth/supabaseClient.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AddToListButton({ anime }) {
  const { user, loading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const malId = anime?.malId;

  // When we know who is logged in, check if this anime is already saved.
  useEffect(() => {
    setSaved(false);
    if (!supabase || !user || !malId) return;
    let cancelled = false;
    supabase.from("my_list").select("mal_id").eq("mal_id", malId).eq("user_id", user.id).limit(1)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError("Couldn't check your list.");
        else setSaved((data || []).length > 0);
      });
    return () => { cancelled = true; };
  }, [user, malId]);

  // Login is turned off: show nothing.
  if (!supabase) return null;
  if (loading) return null;

  // Not logged in: send them to the login page.
  if (!user) return <Link to="/login" className="list-btn">Log in to save</Link>;

  async function toggle() {
    setBusy(true);
    setError("");
    let result;
    if (saved) {
      result = await supabase.from("my_list").delete().eq("mal_id", malId).eq("user_id", user.id);
    } else {
      result = await supabase.from("my_list").insert({
        mal_id: malId,
        title: anime.titleEnglish || anime.title || "Untitled",
        image: anime.image || null,
      });
    }
    if (result.error) setError("Something went wrong. Please try again.");
    else setSaved(!saved);
    setBusy(false);
  }

  return (
    <div>
      <button className={"list-btn" + (saved ? " saved" : "")} onClick={toggle} disabled={busy}>
        {saved ? "Remove from My List" : "Add to My List"}
      </button>
      {error && <p className="muted small">{error}</p>}
    </div>
  );
}
