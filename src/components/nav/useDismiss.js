// Small helper used by every popover: closes it when you click outside or press Escape.
// After Escape, focus goes back to the button that opened it (keyboard users need this).
import { useEffect } from "react";

export default function useDismiss(open, close, wrapRef) {
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      close();
      const trigger = wrapRef.current && wrapRef.current.querySelector("[data-nv-trigger]");
      if (trigger) trigger.focus();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, wrapRef]);
}
