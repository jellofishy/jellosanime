// "Background": a short Wikipedia extract (CC BY-SA 4.0), shown as plain text with credit.
import { safeUrl } from "../safeUrl.js";
import "../detail.css";

export default function Background({ status, extras }) {
  if (status === "loading") {
    return (
      <section className="detail-section">
        <h2>Background</h2>
        <div className="skeleton x-skel" aria-busy="true" aria-label="Loading background" />
      </section>
    );
  }
  const bg = extras && extras.background;
  // Nothing known (or extras failed): show nothing at all.
  if (!bg || !bg.extract) return null;
  const url = safeUrl(bg.url, "https://en.wikipedia.org/");
  return (
    <section className="detail-section">
      <h2>Background</h2>
      <p className="synopsis">{bg.extract}</p>
      <p className="muted small">
        Text from Wikipedia, available under{" "}
        <a className="link" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        {url && <> — <a className="link" href={url} target="_blank" rel="noopener noreferrer">Read the full article on Wikipedia</a></>}
      </p>
    </section>
  );
}
