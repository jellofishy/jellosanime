// Sticky top bar. Wide screens: logo, links, search, language, bell, palette, profile.
// Phones: logo + small icon buttons, and the BottomNav takes over the page links.
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Search } from "lucide-react";
import "../nav.css";
import CommandPalette from "./nav/CommandPalette.jsx";
import LanguageToggle from "./nav/LanguageToggle.jsx";
import NotificationsBell from "./nav/NotificationsBell.jsx";
import PaletteMenu from "./nav/PaletteMenu.jsx";
import ProfileMenu from "./nav/ProfileMenu.jsx";
import BottomNav from "./nav/BottomNav.jsx";

const LINKS = [
  ["/", "Home", true],
  ["/browse", "Browse", false],
  ["/airing", "Airing", false],
  ["/genres", "Genres", false],
  ["/my-list", "My List", false],
];

// Which shortcut to show: Mac uses the Command key.
function shortcutHint() {
  const p = typeof navigator !== "undefined" ? (navigator.platform || "") : "";
  return /Mac|iPhone|iPad/i.test(p) ? "⌘K" : "Ctrl K";
}

export default function Header() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Tells nav.css to leave room at the bottom of the page for the phone tab bar.
  useEffect(() => {
    document.body.classList.add("has-bottom-nav");
    return () => document.body.classList.remove("has-bottom-nav");
  }, []);

  // Shortcuts: Ctrl/Cmd+K anywhere, or "/" when you are not typing in a field.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el && el.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setPaletteOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="nv-header">
        <div className="container nv-inner">
          <Link to="/" className="nv-logo">jellos<span>anime</span></Link>

          <nav className="nv-links" aria-label="Main">
            {LINKS.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => "nv-link" + (isActive ? " is-active" : "")}>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Looks like a search box; opens the palette when tapped */}
          <button type="button" className="nv-search" onClick={() => setPaletteOpen(true)} aria-label="Search anime" aria-haspopup="dialog">
            <Search className="icon" aria-hidden="true" />
            <span className="nv-search-text">Search any anime...</span>
            <kbd className="nv-kbd" aria-hidden="true">{shortcutHint()}</kbd>
          </button>

          <div className="nv-actions">
            <button type="button" className="nv-icon-btn nv-search-icon" onClick={() => setPaletteOpen(true)} aria-label="Search anime" aria-haspopup="dialog">
              <Search className="icon" aria-hidden="true" />
            </button>
            <LanguageToggle />
            <NotificationsBell />
            <PaletteMenu />
            <ProfileMenu />
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <BottomNav />
    </>
  );
}
