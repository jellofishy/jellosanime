// Search "command palette": a modal opened with Ctrl/Cmd+K, "/" or by tapping the search field.
// Type 2+ letters to see live results; arrow keys + Enter pick one; Enter on plain text goes to Browse.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Compass, CalendarClock, LayoutGrid, Bookmark } from "lucide-react";
import { useTheme } from "../../theme/ThemeContext.jsx";
import { displayTitle } from "../../titles.js";
import { isHttps } from "../../safeUrl.js";

const QUICK_LINKS = [
  { key: "q-browse", to: "/browse", label: "Browse", Icon: Compass },
  { key: "q-airing", to: "/airing", label: "Airing", Icon: CalendarClock },
  { key: "q-genres", to: "/genres", label: "Genres", Icon: LayoutGrid },
  { key: "q-list", to: "/my-list", label: "My List", Icon: Bookmark },
];

const FOCUSABLE = "button, a[href], input, [tabindex]:not([tabindex='-1'])";

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { titleLang } = useTheme();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const returnTo = useRef(null);

  // Remember what had focus so we can give it back; reset when closed.
  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement;
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    } else {
      setText(""); setResults([]); setStatus("idle"); setActive(-1);
      const el = returnTo.current;
      if (el && el.focus) el.focus();
      returnTo.current = null;
    }
  }, [open]);

  // Live search: wait 300 ms after typing stops, cancel older requests.
  useEffect(() => {
    const q = text.trim();
    setActive(-1);
    if (!open || q.length < 2) { setResults([]); setStatus("idle"); return; }
    const ctrl = new AbortController();
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anime-list?kind=search&q=${encodeURIComponent(q)}&limit=6`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        setResults(Array.isArray(data && data.results) ? data.results.slice(0, 6) : []);
        setStatus("ok");
      } catch (e) {
        if (e && e.name === "AbortError") return;
        setResults([]); setStatus("error");
      }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [text, open]);

  // The rows we can move through with the arrow keys.
  const showResults = text.trim().length >= 2;
  const items = useMemo(() => {
    if (!showResults) return QUICK_LINKS;
    return results.map((a) => ({ key: "r-" + a.malId, to: `/anime/${a.malId}`, anime: a }));
  }, [showResults, results]);

  function go(to) { onClose(); navigate(to); }

  function onKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (items.length ? (i + 1) % items.length : -1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].to);
      else if (text.trim()) go(`/browse?q=${encodeURIComponent(text.trim())}`);
      return;
    }
    // Focus trap: Tab stays inside the dialog.
    if (e.key === "Tab" && dialogRef.current) {
      const els = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  if (!open) return null;

  return (
    <div className="nv-modal-wrap" onKeyDown={onKeyDown}>
      <div className="nv-modal-scrim" onClick={onClose} />
      <div className="nv-modal" role="dialog" aria-modal="true" aria-label="Search anime" ref={dialogRef}>
        <div className="nv-modal-search">
          <Search className="icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="nv-modal-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search any anime..."
            aria-label="Search anime"
            role="combobox"
            aria-expanded="true"
            aria-controls="nv-results"
            aria-activedescendant={active >= 0 && items[active] ? "nv-opt-" + items[active].key : undefined}
            autoComplete="off"
            maxLength={100}
          />
          <button type="button" className="nv-esc" onClick={onClose} aria-label="Close search">Esc</button>
        </div>

        <div className="nv-modal-body">
          {!showResults && <p className="nv-panel-title">Quick links</p>}
          {showResults && status === "loading" && results.length === 0 && <p className="nv-note">Searching...</p>}
          {showResults && status === "error" && <p className="nv-note">Search isn't working right now. Press Enter to try on the Browse page.</p>}
          {showResults && status === "ok" && results.length === 0 && <p className="nv-note">No quick matches. Press Enter to search Browse.</p>}
          <ul id="nv-results" role="listbox" className="nv-list" aria-label="Results">
            {items.map((it, i) => (
              <li key={it.key} id={"nv-opt-" + it.key} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  className={"nv-row nv-row-btn nv-result" + (i === active ? " is-active" : "")}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it.to)}
                >
                  {it.anime ? (
                    <>
                      {isHttps(it.anime.image)
                        ? <img className="nv-thumb" src={it.anime.image} alt="" loading="lazy" />
                        : <span className="nv-thumb" aria-hidden="true" />}
                      <span className="nv-result-text">
                        <span className="nv-result-title">{displayTitle(it.anime, titleLang)}</span>
                        <span className="nv-result-meta">
                          {[it.anime.year, it.anime.format || it.anime.type].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="nv-row-main"><it.Icon className="icon" aria-hidden="true" /> {it.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="nv-modal-foot">Enter to search Browse. Arrow keys to move. Esc to close.</p>
      </div>
    </div>
  );
}
