import { useEffect } from "react";
import Header from "./components/Header";
import SearchOverlay from "./components/SearchOverlay";
import { Footer, Toast } from "./components/FooterToast";
import HomeScreen from "./screens/HomeScreen";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AdminScreen from "./screens/AdminScreen";
import KitchenScreen from "./screens/KitchenScreen";
import DriverScreen from "./screens/DriverScreen";
import TrackScreen from "./screens/TrackScreen";
import { useStore } from "./store/useStore";
import { restoreSession, saveToken } from "./api/client";

// One-page app with view switching: the shop plus the platform screens
// (auth, profile, owner, kitchen, driver, tracking). On load it restores
// the signed-in session — including the JWT a Google login leaves in the
// URL hash after the backend redirects back.
export default function App() {
  const view = useStore((s) => s.view);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setCartOpen = useStore((s) => s.setCartOpen);
  const setAccountOpen = useStore((s) => s.setAccountOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);
  const setAuthProfile = useStore((s) => s.setAuthProfile);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    if (window.location.hash.includes("token=")) {
      const m = window.location.hash.match(/token=([^&]+)/);
      if (m) {
        saveToken(decodeURIComponent(m[1]));
        showToast("Signed in with Google");
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } else if (window.location.hash.includes("auth_error")) {
      showToast("Google sign-in did not complete");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    restoreSession().then((p) => { if (p) setAuthProfile(p); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every screen starts at the top — like a page navigation.
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  // Escape closes whatever overlay is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setCartOpen(false);
        setAccountOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSearchOpen, setCartOpen, setAccountOpen, setMenuOpen]);

  return (
    <>
      <Header />
      <SearchOverlay />
      {view === "shop" && <HomeScreen />}
      {view === "auth" && <AuthScreen />}
      {view === "profile" && <ProfileScreen />}
      {view === "admin" && <AdminScreen />}
      {view === "kitchen" && <KitchenScreen />}
      {view === "driver" && <DriverScreen />}
      {view === "track" && <TrackScreen />}
      {view === "shop" && <Footer />}
      <Toast />
    </>
  );
}
