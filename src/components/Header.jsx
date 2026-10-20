// Top bar: logo + search box. Searching sends you to the Browse page.
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    if (text.trim()) navigate(`/browse?q=${encodeURIComponent(text.trim())}`);
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">jellos<span>anime</span></Link>
        <form onSubmit={onSubmit} className="search">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search any anime..."
            aria-label="Search anime"
          />
        </form>
        <Link to="/browse" className="nav-link">Browse</Link>
      </div>
    </header>
  );
}
