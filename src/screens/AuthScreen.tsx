import { useState } from "react";
import { api, DEMO_MODE, GOOGLE_URL, saveToken } from "../api/client";
import { useStore } from "../store/useStore";

// Foodie's own login / signup screens (the backend issues a JWT; Google
// sign-in goes through the backend's OAuth flow). No third-party auth UI.
export default function AuthScreen() {
  const mode = useStore((s) => s.authMode);
  const setAuthMode = useStore((s) => s.setAuthMode);
  const setView = useStore((s) => s.setView);
  const setAuthProfile = useStore((s) => s.setAuthProfile);
  const showToast = useStore((s) => s.showToast);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const done = (profile: never) => {
    setAuthProfile(profile);
    showToast(`Welcome, ${(profile as { name?: string }).name || "foodie"}!`);
    setView("shop");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { token, profile } = await api.register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
        saveToken(token);
        done(profile as never);
      } else {
        const { token, profile } = await api.login(id.trim(), password);
        saveToken(token);
        done(profile as never);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const demo = async (role: "customer" | "manager" | "driver") => {
    setBusy(true);
    setError("");
    try {
      const { token, profile } = await api.demoLogin(role);
      saveToken(token);
      setAuthProfile(profile);
      showToast("You are exploring a demo account — demo data resets nightly.");
      setView(role === "manager" ? "kitchen" : role === "driver" ? "driver" : "shop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo accounts are not available right now.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (DEMO_MODE) {
      setBusy(true);
      try {
        const p = await api.googleDemo();
        saveToken("demo-" + p.sub);
        done(p as never);
      } catch { setError("Google demo sign-in failed."); }
      setBusy(false);
      return;
    }
    window.location.href = GOOGLE_URL;
  };

  const forgot = async () => {
    const target = mode === "login" ? id.trim() : email.trim();
    if (!target.includes("@")) return setError("Enter your email above first, then tap Forgot password.");
    try {
      await api.forgot(target);
      showToast("If an account exists for that email, a reset link is on its way");
    } catch { setError("Could not send the reset email right now."); }
  };

  return (
    <main className="auth-wrap">
      <button type="button" className="btn-dark dash-back" onClick={() => setView("shop")}>
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to shop
      </button>
      <section className="auth-card">
        <h1 className="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-sub">{mode === "signup" ? "Order faster, track live, save addresses." : "Login with your email or phone number."}</p>

        <div className="auth-tabs" role="tablist" aria-label="Login or sign up">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setError(""); }}>Login</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setError(""); }}>Sign up</button>
        </div>

        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <>
              <div className="field">
                <label htmlFor="suName">Full name</label>
                <input id="suName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="suEmail">Email</label>
                <input id="suEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="suPhone">Phone number</label>
                <input id="suPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="tel" required />
              </div>
            </>
          )}
          {mode === "login" && (
            <div className="field">
              <label htmlFor="liId">Email or phone number</label>
              <input id="liId" value={id} onChange={(e) => setId(e.target.value)} placeholder="you@example.com or 98765 43210" autoComplete="username" required />
            </div>
          )}
          <div className="field">
            <label htmlFor="authPw">Password</label>
            <input id="authPw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          </div>
          {error && <p className="form-err" role="alert">{error}</p>}
          <button type="submit" className="btn-primary auth-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>

        <button type="button" className="auth-link" onClick={forgot}>Forgot password?</button>

        <div className="auth-divider"><span>or</span></div>
        <button type="button" className="btn-google" onClick={google} disabled={busy}>
          <i className="fa-brands fa-google" aria-hidden="true" /> Continue with Google
        </button>

        <div className="auth-divider"><span>just looking around?</span></div>
        <p className="dash-note">Try a one-click demo account — no sign-up. Demo data resets nightly.</p>
        <div className="tiffin-actions">
          <button type="button" className="btn-dark sm" onClick={() => demo("customer")} disabled={busy}>Demo: Customer</button>
          <button type="button" className="btn-dark sm" onClick={() => demo("manager")} disabled={busy}>Demo: Kitchen</button>
          <button type="button" className="btn-dark sm" onClick={() => demo("driver")} disabled={busy}>Demo: Driver</button>
        </div>
        {DEMO_MODE && <p className="dash-note">Demo mode: accounts are stored in this browser. Connect the backend for real accounts.</p>}
      </section>
    </main>
  );
}
