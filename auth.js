// Foodie — Auth0 authentication (login, signup, Google, password change).
// SETUP: paste your Auth0 Domain and Client ID below (from Auth0 Dashboard >
// Applications > your app > Settings). Until then, the login button shows a
// "setup in progress" note and nothing else changes on the site.
const AUTH_CONFIG = {
  domain: "dev-4jg6o5xx41f8s6nk.us.auth0.com",
  clientId: "5UFiOMgsAn4zkp7hjy9NS8gw6POkttIW",
  connection: "Username-Password-Authentication", // default Auth0 database connection name
};

(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const configured = Boolean(AUTH_CONFIG.domain && AUTH_CONFIG.clientId);
  const authBtn = $("#authBtn");
  const panel = $("#accountPanel");
  if (!authBtn || !panel) return;

  const toast = (msg) => {
    const t = $("#toast");
    if (!t) { alert(msg); return; }
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => (t.hidden = true), 260); }, 3200);
  };

  function setPanel(open) {
    panel.hidden = !open;
    authBtn.setAttribute("aria-expanded", String(open));
  }
  authBtn.addEventListener("click", () => setPanel(panel.hidden));
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !authBtn.contains(e.target)) setPanel(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setPanel(false); });

  /* ---------- Not configured yet ---------- */
  if (!configured) {
    panel.innerHTML =
      '<div class="acc-head"><h2>Account</h2></div>' +
      '<p class="acc-note">Login is being set up. The site owner is connecting Auth0 — ' +
      "check back soon, everything else on the site works as usual.</p>";
    authBtn.addEventListener("click", () => {}, { once: true });
    return;
  }

  /* ---------- Configured: load the Auth0 SPA SDK ---------- */
  let client = null;
  let currentUser = null;

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.auth0 && window.auth0.createAuth0Client) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init() {
    try {
      await loadSdk();
      client = await window.auth0.createAuth0Client({
        domain: AUTH_CONFIG.domain,
        clientId: AUTH_CONFIG.clientId,
        authorizationParams: { redirect_uri: window.location.origin + window.location.pathname },
        cacheLocation: "localstorage",
      });
      // Coming back from Auth0 (login / signup / Google)?
      if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
        await client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (await client.isAuthenticated()) {
        currentUser = await client.getUser();
      }
      render();
    } catch (err) {
      render(); // fall back to logged-out UI; the rest of the site keeps working
    }
  }

  function isGoogleUser(user) {
    return Boolean(user && typeof user.sub === "string" && user.sub.startsWith("google-oauth2|"));
  }
  function phoneFromUser(user) {
    // We use the phone number as the Auth0 "username", so a DB user's
    // username IS their phone number when it looks like one.
    if (user && user.nickname && /^[0-9+ ]{10,15}$/.test(user.nickname)) return user.nickname;
    if (user && user.phone_number) return user.phone_number;
    return "";
  }

  function render() {
    if (!currentUser) {
      authBtn.innerHTML = '<i class="fa-solid fa-circle-user" aria-hidden="true"></i>';
      authBtn.setAttribute("aria-label", "Login or sign up");
      panel.innerHTML =
        '<div class="acc-head"><h2>Welcome to Foodie</h2></div>' +
        '<p class="acc-note">Login to save your details and check out faster. ' +
        "New here? Create an account with your email and phone number.</p>" +
        '<button type="button" class="btn-primary acc-block" id="accLogin">Login</button>' +
        '<button type="button" class="btn-dark acc-block" id="accSignup">Create account</button>' +
        '<button type="button" class="acc-google" id="accGoogle">' +
        '<i class="fa-brands fa-google" aria-hidden="true"></i> Continue with Google</button>' +
        '<p class="acc-note">Forgot your password? Use "Forgot password" on the login page — ' +
        "Auth0 emails you a reset link, free.</p>";
      $("#accLogin").addEventListener("click", () => login());
      $("#accSignup").addEventListener("click", () => login({ screen_hint: "signup" }));
      $("#accGoogle").addEventListener("click", () => login({ connection: "google-oauth2" }));
      return;
    }

    const user = currentUser;
    const google = isGoogleUser(user);
    const phone = phoneFromUser(user);
    const initial = (user.name || user.email || "U").trim().charAt(0).toUpperCase();
    authBtn.innerHTML = user.picture
      ? `<img class="acc-avatar" src="${user.picture}" alt="" />`
      : `<span class="acc-initial">${initial}</span>`;
    authBtn.setAttribute("aria-label", "Your account");

    panel.innerHTML =
      '<div class="acc-head"><h2>Your account</h2></div>' +
      '<div class="acc-user">' +
      (user.picture ? `<img class="acc-avatar-lg" src="${user.picture}" alt="" />` : `<span class="acc-initial-lg">${initial}</span>`) +
      `<div><p class="acc-name">${user.name || ""}</p><p class="acc-mail">${user.email || ""}</p>` +
      (phone ? `<p class="acc-mail">Phone: ${phone}</p>` : "") +
      (google ? '<p class="acc-mail">Signed in with Google</p>' : "") +
      "</div></div>" +
      (google
        ? '<button type="button" class="btn-dark acc-block" id="accSetPass">Set a password</button>' +
          '<p class="acc-note" id="accSetPassNote" hidden></p>'
        : '<button type="button" class="btn-dark acc-block" id="accChangePass">Change password</button>') +
      '<button type="button" class="btn-primary acc-block" id="accLogout">Logout</button>';

    const changeBtn = $("#accChangePass");
    if (changeBtn) changeBtn.addEventListener("click", changePassword);
    const setBtn = $("#accSetPass");
    if (setBtn) setBtn.addEventListener("click", () => {
      const note = $("#accSetPassNote");
      note.hidden = false;
      note.textContent =
        "Your account uses Google, so Google manages your password — change it from your Google account. " +
        "A separate Foodie password needs account linking, which is a planned next step.";
    });
    $("#accLogout").addEventListener("click", () => {
      client.logout({ logoutParams: { returnTo: window.location.origin + window.location.pathname } });
    });

    prefillOrderForm(user, phone);
  }

  function login(extra) {
    if (!client) { toast("Login is loading — try again in a second"); return; }
    client.loginWithRedirect({ authorizationParams: Object.assign({}, extra || {}) });
  }

  // Forgot + change password for database users: Auth0 emails a secure link.
  async function changePassword() {
    if (!currentUser || !currentUser.email) return;
    try {
      const res = await fetch(`https://${AUTH_CONFIG.domain}/dbconnections/change_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: AUTH_CONFIG.clientId,
          email: currentUser.email,
          connection: AUTH_CONFIG.connection,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      toast("Password change link sent — check your email inbox");
    } catch (err) {
      toast("Could not send the password email right now — please try again");
    }
  }

  function prefillOrderForm(user, phone) {
    const name = $("#fName"), email = $("#fEmail"), phoneEl = $("#fPhone");
    if (name && !name.value && user.name) name.value = user.name;
    if (email && !email.value && user.email) email.value = user.email;
    if (phoneEl && !phoneEl.value && phone) phoneEl.value = phone;
  }

  init();
})();
