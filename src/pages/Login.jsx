// Sign up / log in page. Supabase does the secure parts (passwords are never stored by us).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, loginEnabled } from "../auth/supabaseClient.js";
import "../states.css";
import "../login.css";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!loginEnabled) {
    return (
      <div className="login-wrap">
        <div className="login-card glass-sheet"><p className="muted">Login isn't set up yet.</p></div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) navigate("/my-list");
      else setMessage("Check your email and click the confirmation link, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else navigate("/my-list");
    }
    setBusy(false);
  }

  async function forgotPassword() {
    if (!email) return setMessage("Type your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setMessage(error ? error.message : "Password reset email sent.");
  }

  // "Continue with Google": Supabase sends the visitor to Google, then back to our site.
  // (Google must be switched on in the Supabase dashboard first. See docs/DEPLOY.md.)
  async function signInWithGoogle() {
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/my-list` },
    });
    if (error) setMessage(error.message);
  }

  return (
    <div className="login-wrap">
      <form className="login-card glass-sheet" onSubmit={onSubmit}>
        <h1 className="t-h1 login-title">{mode === "login" ? "Log in" : "Create account"}</h1>
        <button type="button" className="btn google-btn" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
        <p className="login-or muted">or use your email</p>
        <div>
          <label htmlFor="login-email" className="field-label">Email</label>
          <input id="login-email" className="field-input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="login-password" className="field-label">Password</label>
          <input id="login-password" className="field-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password (6+ characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
        {message && <p className="muted login-message" role="status">{message}</p>}
        <p className="muted login-links">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <a href="#" className="link" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
            {mode === "login" ? "Create an account" : "Log in"}
          </a>
          {mode === "login" && <> · <a href="#" className="link" onClick={(e) => { e.preventDefault(); forgotPassword(); }}>Forgot password?</a></>}
        </p>
      </form>
    </div>
  );
}
