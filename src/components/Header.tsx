import { useEffect, useRef } from "react";
import { cartCount, useStore } from "../store/useStore";
import { imgUrl } from "../data/dishes";
import CartPanel from "./CartPanel";
import AccountPanel from "./AccountPanel";

// The fixed top bar: logo, section links, and the icon buttons (search,
// favourites filter, cart, account, mobile menu). The cart and account
// panels hang from it, exactly like the original site.
export default function Header() {
  const s = useStore();
  const count = useStore(cartCount);
  const user = useStore((st) => st.authProfile);
  const isAuthenticated = Boolean(user);
  const headerRef = useRef<HTMLElement>(null);

  // A soft shadow once the page scrolls — separates the bar from content.
  useEffect(() => {
    const onScroll = () => headerRef.current?.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the cart/account panels when clicking anywhere outside the header.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        s.setCartOpen(false);
        s.setAccountOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="site-header" ref={headerRef}>
      <nav className="nav" aria-label="Main">
        <a className="logo" href="#Home" aria-label="Foodie — home">
          <img src={imgUrl("foodie-logo.jpg")} alt="Foodie logo" width="100" height="40" />
        </a>

        <ul className={`nav-links${s.menuOpen ? " open" : ""}`} id="navLinks">
          {["Home", "About", "Menu", "Gallery", "Order"].map((x) => (
            <li key={x}>
              <a href={`#${x}`} onClick={() => s.setMenuOpen(false)}>{x}</a>
            </li>
          ))}
        </ul>

        <div className="nav-icons">
          <button type="button" aria-label="Search dishes" aria-expanded={s.searchOpen}
            onClick={() => s.setSearchOpen(!s.searchOpen)}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Show favourite dishes" aria-expanded={s.favsOnly}
            style={s.favsOnly ? { color: "var(--brand-deep)" } : undefined}
            onClick={() => s.setFavsOnly(!s.favsOnly)}>
            <i className="fa-solid fa-heart" aria-hidden="true" />
            {s.favs.length > 0 && <span className="badge">{s.favs.length}</span>}
          </button>
          <button type="button" aria-label="Open cart" aria-expanded={s.cartOpen}
            onClick={() => s.setCartOpen(!s.cartOpen)}>
            <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
            {count > 0 && <span className="badge">{count}</span>}
          </button>
          <button type="button" id="authBtn" aria-label={isAuthenticated ? "Your account" : "Login or sign up"}
            aria-expanded={s.accountOpen} onClick={() => s.setAccountOpen(!s.accountOpen)}>
            {isAuthenticated ? (
              user?.picture
                ? <img className="acc-avatar" src={user.picture} alt="" />
                : <span className="acc-initial">{initial}</span>
            ) : (
              <i className="fa-solid fa-circle-user" aria-hidden="true" />
            )}
          </button>
          <button type="button" id="menuToggle" aria-label="Open menu" aria-expanded={s.menuOpen}
            onClick={() => s.setMenuOpen(!s.menuOpen)}>
            <i className="fa-solid fa-bars" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {s.cartOpen && <CartPanel />}
      {s.accountOpen && <AccountPanel />}
    </header>
  );
}
