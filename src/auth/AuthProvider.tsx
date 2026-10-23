import { Auth0Provider } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { AUTH_CONFIG } from "../components/AccountPanel";

// Wraps the app in Auth0. Login state survives reloads via localStorage,
// and the callback returns to the Foodie page itself (the URL registered
// in the Auth0 dashboard).
export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Auth0Provider
      domain={AUTH_CONFIG.domain}
      clientId={AUTH_CONFIG.clientId}
      authorizationParams={{ redirect_uri: window.location.origin + "/Food-Delivery/" }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
