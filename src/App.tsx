import { useEffect } from "react";
import Header from "./components/Header";
import SearchOverlay from "./components/SearchOverlay";
import { About, Hero } from "./components/Sections";
import { Gallery, MenuSection } from "./components/MenuGallery";
import OrderSection from "./components/OrderSection";
import { Footer, Toast } from "./components/FooterToast";
import { useStore } from "./store/useStore";

export default function App() {
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setCartOpen = useStore((s) => s.setCartOpen);
  const setAccountOpen = useStore((s) => s.setAccountOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);

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
      <main>
        <Hero />
        <About />
        <MenuSection />
        <Gallery />
        <OrderSection />
      </main>
      <Footer />
      <Toast />
    </>
  );
}
