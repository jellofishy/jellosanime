// "Where to watch": LEGAL links only, taken from the server's allow-list.
// Props: status ("loading" | "ok" | "error") and extras (the API answer or null).
import { isHttps, safeUrl, asArray } from "../safeUrl.js";
import "../detail.css";

// One row of link buttons. Links that are not https are skipped.
function LinkButtons({ links }) {
  const good = asArray(links).filter((l) => l && l.service && isHttps(l.url));
  return (
    <div className="btn-row">
      {good.map((l) => (
        <a key={l.service + l.url} className="watch-btn" href={l.url} target="_blank" rel="noopener noreferrer">
          {l.service}
        </a>
      ))}
    </div>
  );
}
const countGood = (links) => asArray(links).filter((l) => l && l.service && isHttps(l.url)).length;

export default function WhereToWatch({ status, extras }) {
  let body;
  if (status === "loading") {
    body = <div className="skeleton x-skel" aria-busy="true" aria-label="Loading where to watch" />;
  } else if (status === "error" || !extras) {
    body = <p className="muted">Couldn't load where-to-watch right now.</p>;
  } else {
    const w = extras.whereToWatch || {};
    const nFree = countGood(w.free);
    const nSub = countGood(w.subscription);
    const nSearch = countGood(w.searchLinks);
    const tmdb = extras.tmdbProviders || null;

    // Plain-text provider names from TMDB (information only, NOT stream links).
    const nameList = tmdb && tmdb.names ? [].concat(
      ...["flatrate", "free", "ads"].map((k) => asArray(tmdb.names[k]))
    ) : [];
    const seen = new Set();
    const uniqueNames = nameList.filter((p) => p.name && !seen.has(p.name) && seen.add(p.name));
    const tmdbLink = tmdb ? safeUrl(tmdb.link, "https://www.themoviedb.org/") : "";

    const searchBlock = nSearch > 0 && (
      <>
        <p className="muted small">Try searching for it on these free services:</p>
        <LinkButtons links={w.searchLinks} />
      </>
    );

    body = (
      <>
        {nFree === 0 && nSub === 0 ? (
          <>
            <p>We don't know a legal link for this show yet.</p>
            {searchBlock}
          </>
        ) : (
          <>
            <h3 className="watch-h">Free (legal, ad-supported)</h3>
            {nFree > 0 ? <LinkButtons links={w.free} /> : (
              <>
                <p className="muted small">No link known</p>
                {searchBlock}
              </>
            )}
            <h3 className="watch-h">Subscription</h3>
            {nSub > 0 ? <LinkButtons links={w.subscription} /> : <p className="muted small">No link known</p>}
          </>
        )}
        <p className="muted small">
          Availability changes and depends on your country. jellosanime never hosts or streams episodes.
        </p>
        {uniqueNames.length > 0 && (
          <div className="tmdb-list small">
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
      <h2 id="watch-title">Where to watch</h2>
      {body}
    </section>
  );
}
