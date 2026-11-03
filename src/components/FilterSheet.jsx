// The Browse filter panel.
//  - On desktop (900px+) it is a flat card that is always visible beside the results.
//  - On phones it becomes a bottom sheet: it springs up from the bottom, the page behind fades to
//    a 40% scrim, you can close it with the Close button, the handle (drag it down), the scrim,
//    or the Escape key. While open, Tab stays inside it, and focus goes back to the button that opened it.
// Props: open (true/false), onClose(), id, title, children (the actual filter controls).
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "../browse.css";

// Tells us if a CSS media query matches right now (and keeps updating).
function useMediaQuery(query) {
  const read = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export default function FilterSheet({ open, onClose, id, title = "Filters", children }) {
  const isSheet = useMediaQuery("(max-width: 899px)");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const drag = useRef({ startY: 0, dy: 0, active: false });
  const sheetOpen = isSheet && open;

  // When the sheet opens: remember who had focus, move focus inside, stop the page behind from scrolling.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const before = document.activeElement;
    const timer = setTimeout(() => closeRef.current && closeRef.current.focus(), 30);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = oldOverflow;
      if (before && before.focus) before.focus(); // give focus back
    };
  }, [sheetOpen]);

  // Escape closes; Tab loops inside the sheet.
  function onKeyDown(e) {
    if (!sheetOpen) return;
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Dragging the handle down: the sheet follows the finger; past 30% of its height it closes.
  function onDragStart(e) {
    drag.current = { startY: e.clientY, dy: 0, active: true };
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = "none";
  }
  function onDragMove(e) {
    if (!drag.current.active || !panelRef.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    panelRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  }
  function onDragEnd() {
    if (!drag.current.active || !panelRef.current) return;
    const el = panelRef.current;
    const tooFar = drag.current.dy > el.offsetHeight * 0.3;
    drag.current.active = false;
    el.style.transition = "";
    el.style.transform = "";
    if (tooFar) onClose();
  }

  return (
    <div className={`filter-host${isSheet ? " is-sheet" : ""}${sheetOpen ? " is-open" : ""}`}>
      {isSheet && <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />}
      <div
        ref={panelRef}
        id={id}
        className={`filter-panel ${isSheet ? "is-sheet-panel" : "card"}`}
        role={isSheet ? "dialog" : undefined}
        aria-modal={isSheet ? "true" : undefined}
        aria-label={title}
        onKeyDown={onKeyDown}
      >
        {isSheet && (
          <div className="sheet-top">
            <div className="sheet-handle" onPointerDown={onDragStart} onPointerMove={onDragMove}
              onPointerUp={onDragEnd} onPointerCancel={onDragEnd} aria-hidden="true"><span /></div>
            <h2 className="t-h3 sheet-title">{title}</h2>
            <button ref={closeRef} type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              <X className="icon" aria-hidden="true" /> Close
            </button>
          </div>
        )}
        {!isSheet && <h2 className="t-h3 panel-title">{title}</h2>}
        {children}
        {isSheet && <button type="button" className="btn btn-primary sheet-done" onClick={onClose}>Show results</button>}
      </div>
    </div>
  );
}
