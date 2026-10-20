// Sun / moon button that switches between the light pink and dark themes.
// The theme lives in the data-theme attribute on <html> (theme.css reads it).
import { useState } from "react";

const KEY = "jellosanime-theme";

// What is the page showing right now? (index.html set it before the first paint.)
function currentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const isDark = theme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    const root = document.documentElement;

    // Brief class so colors blend smoothly instead of snapping.
    root.classList.add("theme-fade");
    setTimeout(() => root.classList.remove("theme-fade"), 400);

    root.setAttribute("data-theme", next);
    // Keep the phone's browser bar color in step.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#1A1322" : "#FFF5F8");

    // Remember the choice (storage can be blocked, so never let it crash).
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
    >
      {/* Sun shows in dark mode ("go light"); moon shows in light mode ("go dark") */}
      {isDark ? (
        <svg key="sun" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg key="moon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
