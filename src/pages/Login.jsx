// Sign up / log in page. Supabase does the secure parts (passwords are never stored by us).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, loginEnabled } from "../auth/supabaseClient.js";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!loginEnabled) return <p className="muted">Login isn't set up yet.</p>;

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

  return (
    <form className="auth-box" onSubmit={onSubmit}>
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password (6+ characters)" value={password}
        onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      <button type="submit" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
      {message && <p className="muted">{message}</p>}
      <p className="muted">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "Create an account" : "Log in"}
        </a>
        {mode === "login" && <> · <a href="#" onClick={(e) => { e.preventDefault(); forgotPassword(); }}>Forgot password?</a></>}
      </p>
    </form>
  );
}
