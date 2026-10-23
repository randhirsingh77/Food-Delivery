import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useStore } from "../store/useStore";

// Login lives in Auth0 (free plan): email + phone-as-username + password,
// or Continue with Google. This panel is the React version of the original
// auth.js panel — same texts, same flows.
export const AUTH_CONFIG = {
  domain: "dev-4jg6o5xx41f8s6nk.us.auth0.com",
  clientId: "5UFiOMgsAn4zkp7hjy9NS8gw6POkttIW",
  connection: "Username-Password-Authentication",
};

export const isGoogleUser = (user: { sub?: string } | undefined) =>
  Boolean(user?.sub?.startsWith("google-oauth2|"));

export function phoneFromUser(user: { nickname?: string; phone_number?: string } | undefined): string {
  if (user?.nickname && /^[0-9+ ]{10,15}$/.test(user.nickname)) return user.nickname;
  if (user?.phone_number) return user.phone_number;
  return "";
}

export default function AccountPanel() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const showToast = useStore((s) => s.showToast);
  const [showSetPassNote, setShowSetPassNote] = useState(false);

  const changePassword = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`https://${AUTH_CONFIG.domain}/dbconnections/change_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: AUTH_CONFIG.clientId, email: user.email, connection: AUTH_CONFIG.connection }),
      });
      if (!res.ok) throw new Error("request failed");
      showToast("Password change link sent — check your email inbox");
    } catch {
      showToast("Could not send the password email right now — please try again");
    }
  };

  if (isLoading) {
    return (
      <aside className="cart-panel account-panel" aria-label="Your account">
        <div className="acc-head"><h2>Account</h2></div>
        <p className="acc-note">Loading…</p>
      </aside>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <aside className="cart-panel account-panel" aria-label="Your account">
        <div className="acc-head"><h2>Welcome to Foodie</h2></div>
        <p className="acc-note">
          Login to save your details and check out faster. New here? Create an account with your
          email and phone number.
        </p>
        <button type="button" className="btn-primary acc-block" onClick={() => loginWithRedirect()}>Login</button>
        <button type="button" className="btn-dark acc-block"
          onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}>
          Create account
        </button>
        <button type="button" className="acc-google"
          onClick={() => loginWithRedirect({ authorizationParams: { connection: "google-oauth2" } })}>
          <i className="fa-brands fa-google" aria-hidden="true" /> Continue with Google
        </button>
        <p className="acc-note">
          Forgot your password? Use "Forgot password" on the login page — Auth0 emails you a
          reset link, free.
        </p>
      </aside>
    );
  }

  const google = isGoogleUser(user);
  const phone = phoneFromUser(user);
  const initial = (user.name || user.email || "U").trim().charAt(0).toUpperCase();

  return (
    <aside className="cart-panel account-panel" aria-label="Your account">
      <div className="acc-head"><h2>Your account</h2></div>
      <div className="acc-user">
        {user.picture
          ? <img className="acc-avatar-lg" src={user.picture} alt="" />
          : <span className="acc-initial-lg">{initial}</span>}
        <div>
          <p className="acc-name">{user.name || ""}</p>
          <p className="acc-mail">{user.email || ""}</p>
          {phone && <p className="acc-mail">Phone: {phone}</p>}
          {google && <p className="acc-mail">Signed in with Google</p>}
        </div>
      </div>

      {google ? (
        <>
          <button type="button" className="btn-dark acc-block" onClick={() => setShowSetPassNote(true)}>
            Set a password
          </button>
          {showSetPassNote && (
            <p className="acc-note">
              Your account uses Google, so Google manages your password — change it from your
              Google account. A separate Foodie password needs account linking, which is a
              planned next step.
            </p>
          )}
        </>
      ) : (
        <button type="button" className="btn-dark acc-block" onClick={changePassword}>
          Change password
        </button>
      )}
      <button type="button" className="btn-primary acc-block"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin + "/Food-Delivery/" } })}>
        Logout
      </button>
    </aside>
  );
}
