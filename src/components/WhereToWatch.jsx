// "Where to watch": LEGAL links only, taken from the server's allow-list.
// Props: status ("loading" | "ok" | "error"), extras (the API answer or null), onRetry (re-runs the request).
// Never a dead end: with no known link we say so and still offer official search pages.
import { ExternalLink } from "lucide-react";
import { isHttps, safeUrl, asArray } from "../safeUrl.js";
import ErrorState from "./ErrorState.jsx";
import "../detail.css";
import "../states.css";

// Keeps only links that have a service name and an https address.
const goodLinks = (links) => asArray(links).filter((l) => l && l.service && isHttps(l.url));

// One row of link buttons.
function LinkButtons({ links, kind = "btn-primary" }) {
  return (
    <div className="btn-row">
      {goodLinks(links).map((l) => (
        <a key={l.service + l.url} className={`btn ${kind}`} href={l.url} target="_blank" rel="noopener noreferrer">
          {l.service} <ExternalLink className="icon" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export default function WhereToWatch({ status, extras, onRetry }) {
  let body;
  if (status === "loading") {
    body = <div className="skeleton x-skel" aria-busy="true" aria-label="Loading where to watch" />;
  } else if (status === "error" || !extras) {
    body = <ErrorState variant="strip" what="Where to watch" onRetry={onRetry} />;
  } else {
    const w = extras.whereToWatch || {};
    const nFree = goodLinks(w.free).length;
    const nSub = goodLinks(w.subscription).length;
    const nSearch = goodLinks(w.searchLinks).length;
    const tmdb = extras.tmdbProviders || null;

    // Plain-text provider names from TMDB (information only, NOT stream links).
    const nameList = tmdb && tmdb.names ? [].concat(
      ...["flatrate", "free", "ads"].map((k) => asArray(tmdb.names[k]))
    ) : [];
    const seen = new Set();
    const uniqueNames = nameList.filter((p) => p.name && !seen.has(p.name) && seen.add(p.name));
    const tmdbLink = tmdb ? safeUrl(tmdb.link, "https://www.themoviedb.org/") : "";

    // Official search pages (secondary buttons), shown whenever we have them.
    const searchBlock = nSearch > 0 && (
      <div className="watch-search">
        <p className="muted t-caption">Try searching for it on these official services:</p>
        <LinkButtons links={w.searchLinks} kind="btn-secondary" />
      </div>
    );

    body = (
      <>
        {nFree === 0 && nSub === 0 ? (
          <div className="watch-group">
            <h3 className="t-h3">No legal streaming link known yet</h3>
            <p>We only list official services. When one is confirmed for your region, it will appear here.</p>
            {searchBlock}
          </div>
        ) : (
          <div className="watch-groups">
            <div className="watch-group">
              <h3 className="t-h3">Free (legal, ad-supported)</h3>
              {nFree > 0 ? <LinkButtons links={w.free} /> : <p className="muted">No link known yet</p>}
            </div>
            <div className="watch-group">
              <h3 className="t-h3">Subscription</h3>
              {nSub > 0 ? <LinkButtons links={w.subscription} /> : <p className="muted">No link known yet</p>}
            </div>
            {nFree === 0 && searchBlock && <div className="watch-group watch-wide">{searchBlock}</div>}
          </div>
        )}
        <p className="muted t-caption">
          Availability changes and depends on your country. jellosanime never hosts or streams episodes.
        </p>
        {uniqueNames.length > 0 && (
          <div className="tmdb-list t-caption">
            <span className="muted">Also listed on TMDB (via JustWatch): </span>
            {uniqueNames.map((p, i) => (
              <span key={p.name} className="tmdb-name">
                {isHttps(p.logo) && <img src={p.logo} alt="" width="20" height="20" loading="lazy" />}
                {p.name}{i < uniqueNames.length - 1 ? ", " : ""}
              </span>
            ))}
            {tmdbLink && <> · <a className="link" href={tmdbLink} target="_blank" rel="noopener noreferrer">See on TMDB</a></>}
          </div>
        )}
      </>
    );
  }
  return (
    <section className="detail-section" aria-labelledby="watch-title">
      <h2 id="watch-title" className="t-h2">Where to watch</h2>
      {body}
    </section>
  );
}
