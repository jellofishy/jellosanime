// Top bar: logo + search box. Searching sends you to the Browse page.
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { supabase, loginEnabled } from "../auth/supabaseClient.js";

export default function Header() {
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);

  // Keyboard shortcut: pressing "/" jumps to the search box (unless you are already typing somewhere).
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el && el.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      if (inputRef.current) inputRef.current.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    if (text.trim()) navigate(`/browse?q=${encodeURIComponent(text.trim())}`);
  }

  return (
    <header className="header glass-bar">
      <div className="container header-inner">
        <Link to="/" className="logo">jellos<span>anime</span></Link>
        <form onSubmit={onSubmit} className="search" role="search">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search any anime..."
            aria-label="Search anime"
          />
          {/* Hint only: shows which key jumps to search */}
          <kbd className="search-hint" aria-hidden="true">/</kbd>
        </form>
        <Link to="/browse" className="nav-link">Browse</Link>
        <ThemeToggle />
        {(user && loginEnabled ? (
          <>
            <Link to="/my-list" className="nav-link">My List</Link>
            <button className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut()}>Log out</button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">Log in</Link>
        ))}
      </div>
    </header>
  );
}
