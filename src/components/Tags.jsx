// Fan-made tags from AniList. Shows the top ~10, skips ones already shown as genres.
import { asArray } from "../safeUrl.js";
import "../detail.css";

export default function Tags({ extras, skip = [] }) {
  const have = new Set(skip.map((s) => String(s).toLowerCase()));
  const tags = asArray(extras && extras.tags)
    .filter((t) => t && t.name && !have.has(String(t.name).toLowerCase()))
    .sort((a, b) => (b.rank || 0) - (a.rank || 0))
    .slice(0, 10);
  if (tags.length === 0) return null;
  return (
    <div className="chips" aria-label="Tags">
      {tags.map((t) => <span className="chip chip-tag" key={t.name}>{t.name}</span>)}
    </div>
  );
}
