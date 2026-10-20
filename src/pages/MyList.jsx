// "My List": anime the logged-in user saved. Row Level Security means the database
// only ever returns THIS user's rows. (The "save" button on the detail page comes in M2.)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../auth/supabaseClient.js";
import { useAuth } from "../auth/AuthContext.jsx";
import AnimeCard from "../components/AnimeCard.jsx";

export default function MyList() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("my_list").select("mal_id,title,image").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, [user]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <p>Please <Link to="/login" style={{ color: "var(--accent)" }}>log in</Link> to see your list.</p>;

  return (
    <>
      <h1>My List</h1>
      {items && items.length === 0 && <p className="muted">Nothing saved yet. Open an anime and tap "Add to My List".</p>}
      <div className="grid">
        {(items || []).map((i) => (
          <AnimeCard key={i.mal_id} anime={{ malId: i.mal_id, title: i.title, image: i.image }} />
        ))}
      </div>
    </>
  );
}
