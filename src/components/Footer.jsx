// Credits for every data source, plus TMDB's required notice.
import "../detail.css";

const SOURCES = [
  ["Jikan", "https://jikan.moe", "MyAnimeList data: backup anime info and MyAnimeList reviews"],
  ["AniList", "https://anilist.co", "main anime catalog, airing times, banners, tags, reviews and watch links"],
  ["Kitsu", "https://kitsu.app", "reviews and watch links"],
  ["Wikipedia (CC BY-SA 4.0)", "https://www.wikipedia.org", "background text"],
  ["Wikidata", "https://www.wikidata.org", "matching shows across sites"],
  ["TMDB", "https://www.themoviedb.org", "extra images and where-it-is-listed info"],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>
          <strong>jellosanime</strong> is an information site. jellosanime doesn't host, stream
          or embed episodes. We only link to legal services.
        </p>
        <p>Data and credits:</p>
        <ul className="footer-sources">
          {SOURCES.map(([name, url, use]) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noopener noreferrer">{name}</a> — {use}
            </li>
          ))}
        </ul>
        {/* TODO: add the TMDB logo here once its URL (TMDB_LOGO_URL in netlify/adapters/tmdb.js)
            has been checked in a browser; it is marked UNVERIFIED, so only the notice is shown. */}
        <p>This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>
      </div>
    </footer>
  );
}
