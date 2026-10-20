// Share button: uses the phone's share sheet if there is one,
// otherwise copies the page address and says "Link copied!".
import { useState } from "react";
import "../detail.css";

export default function ShareButton({ title }) {
  const [msg, setMsg] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied!");
    } catch (err) {
      // Closing the share sheet counts as an error too: stay quiet in that case.
      if (err && err.name === "AbortError") return;
      setMsg("Couldn't copy the link.");
    }
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <span className="share-wrap">
      <button type="button" className="ghost-btn" onClick={share} aria-label={`Share ${title}`}>
        <span aria-hidden="true">↗</span> Share
      </button>
      <span className="muted small" aria-live="polite">{msg}</span>
    </span>
  );
}
