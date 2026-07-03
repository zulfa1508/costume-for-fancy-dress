import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AuthPage() {
  const { login, register, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ fullName: "", email: "", password: "", confirm: "" });

  React.useEffect(() => {
    if (user) navigate(isAdmin ? "/admin" : "/catalog", { replace: true });
  }, [user, isAdmin, navigate]);

  function switchMode(next) {
    setMode(next);
    setErr("");
  }

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(loginForm.email, loginForm.password);
      navigate(u.role === "admin" ? "/admin" : "/catalog", { replace: true });
    } catch (x) {
      setErr(x.message);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setErr("");
    if (regForm.password !== regForm.confirm) {
      setErr("Passwords do not match");
      return;
    }
    try {
      await register({ email: regForm.email, password: regForm.password, fullName: regForm.fullName });
      navigate("/catalog", { replace: true });
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <>
      <h1 className="page-title">{mode === "login" ? "Welcome back" : "Join Twirl Boutique"}</h1>
      <p className="lede">
        {mode === "login" ? "Sign in to your account." : "Create an account in a few steps."}
      </p>
      <div className="auth-shell">
        <div className="card">
          <div className="auth-mode-toggle" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => switchMode("signup")}>
              Sign up
            </button>
          </div>
          {err ? <div className="err">{err}</div> : null}
          {mode === "login" ? (
            <>
              <h2 style={{ marginBottom: "1rem" }}>
                Sign in <span className="badge">Customer</span>
              </h2>
              <form onSubmit={onLogin}>
                <label className="field">Email</label>
                <input value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} type="email" autoComplete="username" required />
                <label className="field">Password</label>
                <input value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} type="password" autoComplete="current-password" required />
                <button type="submit" className="btn btn-primary btn-block">
                  Log in
                </button>
              </form>
              <p className="auth-switch-hint">
                New here?
                <button type="button" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: "1rem" }}>
                Register <span className="badge">Secure</span>
              </h2>
              <form onSubmit={onRegister}>
                <label className="field">Full name</label>
                <input value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} required />
                <label className="field">Email</label>
                <input value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} type="email" required />
                <div className="row">
                  <div>
                    <label className="field">Password</label>
                    <input value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} type="password" minLength={8} required />
                  </div>
                  <div>
                    <label className="field">Confirm</label>
                    <input value={regForm.confirm} onChange={(e) => setRegForm({ ...regForm, confirm: e.target.value })} type="password" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-secondary btn-block">
                  Create account
                </button>
              </form>
              <p className="auth-switch-hint">
                Already have an account?
                <button type="button" onClick={() => switchMode("login")}>
                  Log in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
