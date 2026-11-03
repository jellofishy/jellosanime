// Keeps the look of the site (dark/light, accent color, title language) and shares it with every page.
//   const { mode, setMode, accent, setAccent, titleLang, setTitleLang, ACCENTS } = useTheme();
// - The choice is saved in this browser (localStorage).
// - If someone is logged in it is also saved to their `profiles` row in Supabase, so it follows them
//   to other devices. If that table does not exist yet, nothing breaks: errors are ignored on purpose.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../auth/supabaseClient.js";
import { useAuth } from "../auth/AuthContext.jsx";

// The five accent colors the visitor can choose (swatch = the color of the little dot in the menu).
export const ACCENTS = [
  { key: "pink", label: "Pink", swatch: "#EC4899" },
  { key: "purple", label: "Purple", swatch: "#8B5CF6" },
  { key: "blue", label: "Blue", swatch: "#3B82F6" },
  { key: "green", label: "Green", swatch: "#22C55E" },
  { key: "orange", label: "Orange", swatch: "#F97316" },
];

const MODES = ["dark", "light"];
const ACCENT_KEYS = ACCENTS.map((a) => a.key);
const TITLE_LANG_KEYS = ["english", "romanized", "native"];

const KEYS = { mode: "jellosanime-mode", accent: "jellosanime-accent", titleLang: "jellosanime-titlelang" };
const DEFAULTS = { mode: "dark", accent: "pink", titleLang: "english" };

// Safe localStorage helpers (storage can be blocked in private mode).
function readSaved(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // ignore
  }
}

// The first value to use: what is saved, otherwise (mode only) the device preference, otherwise the default.
function initialMode() {
  const saved = readSaved(KEYS.mode);
  if (MODES.includes(saved)) return saved;
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  } catch (e) {
    // ignore
  }
  return DEFAULTS.mode;
}
function initialOf(storageKey, allowed, fallback) {
  const saved = readSaved(storageKey);
  return allowed.includes(saved) ? saved : fallback;
}

const ThemeContext = createContext({
  ...DEFAULTS,
  setMode: () => {},
  setAccent: () => {},
  setTitleLang: () => {},
  ACCENTS,
});

// Works even without the provider: returns the defaults.
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState(initialMode);
  const [accent, setAccentState] = useState(() => initialOf(KEYS.accent, ACCENT_KEYS, DEFAULTS.accent));
  const [titleLang, setTitleLangState] = useState(() => initialOf(KEYS.titleLang, TITLE_LANG_KEYS, DEFAULTS.titleLang));

  // Always the newest values, for the debounced save below.
  const latest = useRef({ mode, accent, titleLang });
  latest.current = { mode, accent, titleLang };
  const saveTimer = useRef(null);

  // Put the choice on <html> so theme.css can react to it.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.setAttribute("data-accent", accent);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "light" ? "#F7F7F9" : "#0F0F12");
  }, [mode, accent]);

  // Save to the user's profile (debounced 500 ms). Every error is ignored on purpose.
  const queueProfileSave = useCallback(() => {
    if (!supabase || !user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const v = latest.current;
        await supabase
          .from("profiles")
          .update({ accent: v.accent, mode: v.mode, title_lang: v.titleLang })
          .eq("id", user.id);
      } catch (e) {
        // never block the page
      }
    }, 500);
  }, [user]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Setters used by the menus. A real change by the visitor is saved locally and (if logged in) to the profile.
  const setMode = useCallback(
    (value) => {
      if (!MODES.includes(value)) return;
      setModeState(value);
      save(KEYS.mode, value);
      queueProfileSave();
    },
    [queueProfileSave]
  );
  const setAccent = useCallback(
    (value) => {
      if (!ACCENT_KEYS.includes(value)) return;
      setAccentState(value);
      save(KEYS.accent, value);
      queueProfileSave();
    },
    [queueProfileSave]
  );
  const setTitleLang = useCallback(
    (value) => {
      if (!TITLE_LANG_KEYS.includes(value)) return;
      setTitleLangState(value);
      save(KEYS.titleLang, value);
      queueProfileSave();
    },
    [queueProfileSave]
  );

  // After login: load the saved profile and apply it .
  const userId = user ? user.id : null;
  useEffect(() => {
    if (!supabase || !userId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("accent,mode,title_lang")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        // Uses the raw state setters (not setMode etc.), so nothing is written back to the server.
        if (ACCENT_KEYS.includes(data.accent)) {
          setAccentState(data.accent);
          save(KEYS.accent, data.accent);
        }
        if (MODES.includes(data.mode)) {
          setModeState(data.mode);
          save(KEYS.mode, data.mode);
        }
        if (TITLE_LANG_KEYS.includes(data.title_lang)) {
          setTitleLangState(data.title_lang);
          save(KEYS.titleLang, data.title_lang);
        }
      } catch (e) {
        // table missing or offline: keep the local choice
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo(
    () => ({ mode, setMode, accent, setAccent, titleLang, setTitleLang, ACCENTS }),
    [mode, setMode, accent, setAccent, titleLang, setTitleLang]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
