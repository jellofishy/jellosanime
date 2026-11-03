// Theme palette button: Light/Dark switch + 5 accent color swatches.
// Everything applies instantly through useTheme() (which also remembers the choice).
import { useCallback, useRef, useState } from "react";
import { Palette, Sun, Moon, Check } from "lucide-react";
import { useTheme } from "../../theme/ThemeContext.jsx";
import useDismiss from "./useDismiss.js";

// Fallback list in case the theme file does not export ACCENTS.
const DEFAULT_ACCENTS = ["pink", "purple", "blue", "green", "orange"];

export default function PaletteMenu() {
  const { mode, setMode, accent, setAccent, ACCENTS } = useTheme();
  // ACCENTS may be a list of names or a list of {key} objects; we only need the names.
  const accents = (Array.isArray(ACCENTS) && ACCENTS.length ? ACCENTS : DEFAULT_ACCENTS)
    .map((a) => (typeof a === "string" ? a : a.key));
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrapRef);

  return (
    <div className="nv-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        data-nv-trigger
        className="nv-icon-btn"
        aria-label="Theme and colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Palette className="icon" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="nv-scrim" onClick={close} />
          <div className="nv-panel nv-panel-sm" role="dialog" aria-label="Theme and colors">
            <p className="nv-panel-title">Mode</p>
            <div className="nv-mode">
              <button type="button" className={"nv-mode-btn" + (mode === "light" ? " is-on" : "")}
                aria-pressed={mode === "light"} aria-label="Light mode" onClick={() => setMode("light")}>
                <Sun className="icon" aria-hidden="true" /> Light
              </button>
              <button type="button" className={"nv-mode-btn" + (mode === "dark" ? " is-on" : "")}
                aria-pressed={mode === "dark"} aria-label="Dark mode" onClick={() => setMode("dark")}>
                <Moon className="icon" aria-hidden="true" /> Dark
              </button>
            </div>
            <p className="nv-panel-title">Accent color</p>
            <div className="nv-swatches">
              {accents.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={"nv-swatch nv-swatch-" + name + (accent === name ? " is-on" : "")}
                  aria-pressed={accent === name}
                  aria-label={`${name} accent`}
                  title={name}
                  onClick={() => setAccent(name)}
                >
                  {accent === name && <Check className="icon" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
