// Home page. "Airing Today" and "Trending" come from AniList in later steps.
import AnimeRow from "../components/AnimeRow.jsx";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Find your next anime</h1>
        <p>Every anime, what it's about, what fans think, and where to watch it legally.</p>
      </section>
      <AnimeRow title="Top Anime" kind="top" />
      <AnimeRow title="This Season" kind="season" />
      <AnimeRow title="Popular Right Now" kind="airing" />
    </>
  );
}
