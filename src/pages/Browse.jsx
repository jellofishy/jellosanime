// Browse / search results page. Reads the search text from the address (?q=...).
// Genre/year/season filters get added in a later step.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList } from "../api.js";
import AnimeCard from "../components/AnimeCard.jsx";

export default function Browse() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  // New search text -> go back to page 1.
  useEffect(() => setPage(1), [q]);

  useEffect(() => {
    setData(null);
    setError(false);
    fetchAnimeList({ kind: "search", q, page, limit: 24 })
      .then(setData)
      .catch(() => setError(true));
  }, [q, page]);

  return (
    <>
      <h1>{q ? `Results for "${q}"` : "Browse anime"}</h1>
      {error && <p className="muted">Couldn't load anime right now. Please try again.</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && data.results.length === 0 && <p className="muted">No anime found.</p>}
      {data && (
        <>
          <div className="grid">
            {data.results.map((a) => <AnimeCard key={a.malId} anime={a} />)}
          </div>
          <div className="pager">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page}</span>
            <button disabled={!data.hasNextPage} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </>
  );
}
