// Shows the official trailer (YouTube, privacy-friendly "nocookie" player).
// This is the ONLY place we embed video.
export default function Trailer({ youtubeId }) {
  // Only allow normal-looking YouTube ids (letters, numbers, - and _).
  const valid = typeof youtubeId === "string" && /^[\w-]{6,20}$/.test(youtubeId);

  if (!valid) return <p className="muted">No official trailer available</p>;

  return (
    <div className="trailer">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
        title="Official trailer"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
