// Avatar button. Logged out: sign-in options. Logged in: name, My List, Sign out.
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { User, LogOut, Bookmark, Mail } from "lucide-react";
import { useAuth } from "../../auth/AuthContext.jsx";
import { supabase, loginEnabled } from "../../auth/supabaseClient.js";
import { isHttps } from "../../safeUrl.js";
import useDismiss from "./useDismiss.js";

export default function ProfileMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);
  const close = useCallback(() => { setOpen(false); setError(""); }, []);
  useDismiss(open, close, wrapRef);

  const meta = (user && user.user_metadata) || {};
  const avatar = [meta.avatar_url, meta.picture].find(isHttps) || "";
  const name = meta.user_name || meta.full_name || meta.name || (user && user.email) || "";
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  async function google() {
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) setError(err.message || "Google sign-in failed.");
    } catch (e) {
      setError((e && e.message) || "Google sign-in failed.");
    }
  }

  async function signOut() {
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    close();
  }

  return (
    <div className="nv-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        data-nv-trigger
        className="nv-icon-btn nv-avatar-btn"
        aria-label={user ? "Account menu" : "Sign in"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {user ? (
          avatar ? <img src={avatar} alt="" className="nv-avatar" referrerPolicy="no-referrer" />
                 : <span className="nv-avatar nv-avatar-initial" aria-hidden="true">{initial}</span>
        ) : (
          <User className="icon" aria-hidden="true" />
        )}
      </button>
      {open && (
        <>
          <div className="nv-scrim" onClick={close} />
          <div className="nv-panel nv-panel-sm" role="menu" aria-label="Account">
            {user ? (
              <>
                <p className="nv-who">{name}</p>
                {user.email && user.email !== name && <p className="nv-who-sub">{user.email}</p>}
                <Link to="/my-list" role="menuitem" className="nv-row nv-row-btn" onClick={close}>
                  <span className="nv-row-main"><Bookmark className="icon" aria-hidden="true" /> My List</span>
                </Link>
                <button type="button" role="menuitem" className="nv-row nv-row-btn" onClick={signOut}>
                  <span className="nv-row-main"><LogOut className="icon" aria-hidden="true" /> Sign out</span>
                </button>
              </>
            ) : (
              <>
                <p className="nv-panel-title">Sign in to save your list</p>
                {loginEnabled && (
                  <button type="button" role="menuitem" className="btn btn-secondary nv-full" onClick={google}>
                    Sign in with Google
                  </button>
                )}
                <Link to="/login" role="menuitem" className="btn btn-primary nv-full" onClick={close}>
                  <Mail className="icon" aria-hidden="true" /> Sign in with email
                </Link>
                {error && <p className="nv-error" role="alert">{error}</p>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
