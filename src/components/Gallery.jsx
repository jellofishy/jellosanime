// Small picture gallery (from TMDB). Clicking a picture opens a larger view.
// The TMDB attribution is always shown with it.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { isHttps, asArray } from "../safeUrl.js";
import "../detail.css";

export default function Gallery({ extras, title }) {
  const [open, setOpen] = useState("");
  const images = asArray(extras && extras.images).filter(isHttps).slice(0, 8);

  // Escape closes the larger view.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(""); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (images.length === 0) return null;
  const att = extras.tmdbAttribution || null;
  return (
    <section className="detail-section">
      <h2 className="t-h2">Images</h2>
      <div className="gallery">
        {images.map((src, i) => (
          <button key={src} type="button" className="gallery-item lift" onClick={() => setOpen(src)}
            aria-label={`View larger image ${i + 1} of ${title}`}>
            <img src={src} alt={`${title} picture ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Larger image"
          onClick={() => setOpen("")}>
          <img src={open} alt={`${title}, larger view`} />
          <button type="button" className="btn btn-primary lightbox-close" onClick={() => setOpen("")}><X className="icon" aria-hidden="true" /> Close</button>
        </div>
      )}
      {att && att.text && (
        <p className="muted t-caption tmdb-note">
          {isHttps(att.logo) && <img src={att.logo} alt="TMDB" height="14" loading="lazy" />}{" "}
          {att.text}
        </p>
      )}
    </section>
  );
}
