// Round "back to top" button. Appears after you scroll down a little.
// (On phones nav.css lifts it above the bottom tab bar.)
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

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
      className={"nv-btt" + (show ? " is-shown" : "")}
      onClick={goUp}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={show ? undefined : true}
    >
      <ArrowUp className="icon" aria-hidden="true" />
    </button>
  );
}
