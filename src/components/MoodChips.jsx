// Quick-pick mood chips (D6). Each one opens Browse with matching genres already selected.
import { Link } from "react-router-dom";
import { MOODS, moodLink } from "../browseFilters.js";
import "../home.css";

export default function MoodChips() {
  return (
    <nav className="mood-chips" aria-label="Pick a mood">
      {MOODS.map((m) => (
        <Link key={m.label} to={moodLink(m)} className="mood-chip">{m.label}</Link>
      ))}
    </nav>
  );
}
