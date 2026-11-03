// Title language switch: English / Romanized / Native.
// Wide screens show a small segmented control; phones show an icon button that opens a menu.
import { useCallback, useRef, useState } from "react";
import { Languages, Check } from "lucide-react";
import { useTheme } from "../../theme/ThemeContext.jsx";
import useDismiss from "./useDismiss.js";

const OPTIONS = [
  ["english", "English", "EN"],
  ["romanized", "Romanized", "Romaji"],
  ["native", "Native", "Native"],
];

export default function LanguageToggle() {
  const { titleLang, setTitleLang } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrapRef);

  return (
    <div className="nv-pop-wrap" ref={wrapRef}>
      {/* Wide screens: segmented control */}
      <div className="nv-seg" role="group" aria-label="Title language">
        {OPTIONS.map(([value, full, short]) => (
          <button
            key={value}
            type="button"
            className={"nv-seg-btn" + (titleLang === value ? " is-on" : "")}
            aria-pressed={titleLang === value}
            aria-label={`${full} titles`}
            onClick={() => setTitleLang(value)}
          >
            {short}
          </button>
        ))}
      </div>

      {/* Phones and tablets: icon button + small menu */}
      <button
        type="button"
        data-nv-trigger
        className="nv-icon-btn nv-lang-btn"
        aria-label="Title language"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Languages className="icon" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="nv-scrim" onClick={close} />
          <div className="nv-panel nv-panel-sm nv-lang-menu" role="menu" aria-label="Title language">
            <p className="nv-panel-title">Title language</p>
            {OPTIONS.map(([value, full]) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={titleLang === value}
                className="nv-row nv-row-btn"
                onClick={() => { setTitleLang(value); close(); }}
              >
                <span>{full}</span>
                {titleLang === value && <Check className="icon" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
