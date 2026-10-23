import { useState } from "react";
import { api, logout } from "../api/client";
import { useStore } from "../store/useStore";

// Account panel (header dropdown) for Foodie's own auth system: login /
// signup entry points when signed out; profile links, role dashboards and
// change-password when signed in.
export default function AccountPanel() {
  const authProfile = useStore((s) => s.authProfile);
  const setAuthProfile = useStore((s) => s.setAuthProfile);
  const setAccountOpen = useStore((s) => s.setAccountOpen);
  const setView = useStore((s) => s.setView);
  const setAuthMode = useStore((s) => s.setAuthMode);
  const showToast = useStore((s) => s.showToast);

  const [showPw, setShowPw] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (view: "auth" | "profile" | "admin" | "kitchen" | "driver", mode?: "login" | "signup") => {
    if (mode) setAuthMode(mode);
    setView(view);
    setAccountOpen(false);
  };

  if (!authProfile) {
    return (
      <div className="panel account-panel">
        <p className="panel-title">Your account</p>
        <p className="panel-note">Login to track orders live, save addresses and check out faster.</p>
        <button type="button" className="btn-primary panel-btn" onClick={() => go("auth", "login")}>Login</button>
        <button type="button" className="btn-dark panel-btn" onClick={() => go("auth", "signup")}>Create account</button>
        <p className="panel-note">New here? Creating an account takes under a minute — name, email, phone and a password.</p>
      </div>
    );
  }

  const changePw = async () => {
    setMsg("");
    if (next.length < 8) return setMsg("New password must be at least 8 characters.");
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      setCur(""); setNext(""); setShowPw(false);
      showToast("Password changed");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    setAuthProfile(null);
    setAccountOpen(false);
    showToast("Logged out");
  };

  const role = authProfile.role;

  return (
    <div className="panel account-panel">
      <div className="acc-user">
        {authProfile.picture
          ? <img className="acc-avatar" src={authProfile.picture} alt="" />
          : <span className="acc-initial">{(authProfile.name || authProfile.email || "U").charAt(0).toUpperCase()}</span>}
        <div>
          <p className="acc-name">{authProfile.name || "Foodie user"}</p>
          <p className="acc-mail">{authProfile.email}{authProfile.phone ? ` · ${authProfile.phone}` : ""}</p>
          <p className="acc-mail">Role: <strong>{role}</strong></p>
        </div>
      </div>

      <button type="button" className="btn-dark panel-btn" onClick={() => go("profile")}>
        <i className="fa-solid fa-user" aria-hidden="true" /> Profile &amp; my orders
      </button>
      {role === "admin" && (
        <button type="button" className="btn-dark panel-btn" onClick={() => go("admin")}>
          <i className="fa-solid fa-chart-line" aria-hidden="true" /> Owner dashboard
        </button>
      )}
      {(role === "manager" || role === "admin") && (
        <button type="button" className="btn-dark panel-btn" onClick={() => go("kitchen")}>
          <i className="fa-solid fa-fire-burner" aria-hidden="true" /> Kitchen
        </button>
      )}
      {role === "driver" && (
        <button type="button" className="btn-dark panel-btn" onClick={() => go("driver")}>
          <i className="fa-solid fa-motorcycle" aria-hidden="true" /> Driver dashboard
        </button>
      )}

      {showPw ? (
        <div className="pw-box">
          <div className="field">
            <label htmlFor="curPw">Current password</label>
            <input id="curPw" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="newPw">New password</label>
            <input id="newPw" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          {msg && <p className="form-err" role="alert">{msg}</p>}
          <button type="button" className="btn-primary panel-btn" onClick={changePw} disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
        </div>
      ) : (
        <button type="button" className="btn-dark panel-btn" onClick={() => setShowPw(true)}>Change password</button>
      )}
      <button type="button" className="btn-dark panel-btn" onClick={signOut}>Logout</button>
    </div>
  );
}
