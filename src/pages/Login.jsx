// Sign up / log in page. Supabase does the secure parts (passwords are never stored by us).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
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
        <div className="login-card"><p className="muted">Login isn't set up yet.</p></div>
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
      <form className="login-card" onSubmit={onSubmit}>
        <h1 className="t-h1 login-title">{mode === "login" ? "Log in" : "Create account"}</h1>
        <button type="button" className="btn google-btn" onClick={signInWithGoogle}>
          <LogIn className="icon" aria-hidden="true" />
          Continue with Google
        </button>
        <p className="login-or muted">or use your email</p>
        <div>
          <label htmlFor="login-email" className="login-label">Email</label>
          <input id="login-email" className="login-input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="login-password" className="login-label">Password</label>
          <input id="login-password" className="login-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password (6+ characters)" value={password}
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
