// Round "back to top" button. Appears after you scroll down a little.
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() { setShow(window.scrollY > 400); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goUp() {
    // People who asked for less motion get an instant jump instead of a glide.
    const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className={"back-to-top" + (show ? " show" : "")}
      onClick={goUp}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={show ? undefined : true}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
