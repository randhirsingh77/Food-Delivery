import { useEffect, useLayoutEffect, useRef } from "react";
import { DISHES, imgUrl, scoreDish, type Dish } from "../data/dishes";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";

// The sticky search panel. It is anchored to the header's real bottom edge
// at the moment it opens (measured, never written back into CSS — the old
// site once grew its own header by doing exactly that). Results are scored
// matches; below them, same-category dishes appear as "You may also like".
export default function SearchOverlay() {
  const s = useStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const position = () => {
    const header = document.querySelector(".site-header");
    if (header && overlayRef.current) {
      overlayRef.current.style.top = header.getBoundingClientRect().bottom + "px";
    }
  };

  useLayoutEffect(() => {
    if (s.searchOpen) {
      position();
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [s.searchOpen]);

  useEffect(() => {
    const onResize = () => { if (s.searchOpen) position(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [s.searchOpen]);

  if (!s.searchOpen) return null;

  const q = s.query.trim().toLowerCase();
  const scored = DISHES.map((d) => ({ d, score: scoreDish(d, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 5).map((x) => x.d);
  const similar = q
    ? DISHES.filter((d) => !results.includes(d) && results.some((r) => r.category === d.category)).slice(0, 3)
    : [];
  const popular = DISHES.filter((d) => d.tag === "Bestseller");

  const goToDish = (dish: Dish) => {
    s.setSearchOpen(false);
    s.setQuery("");
    s.setCategory("All");
    s.setFavsOnly(false);
    requestAnimationFrame(() => {
      const card = document.getElementById(`dish-${dish.name}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.remove("highlight");
        void card.offsetWidth;
        card.classList.add("highlight");
      }
    });
  };

  const item = (dish: Dish) => (
    <li key={dish.name} onClick={() => goToDish(dish)}>
      <img src={imgUrl(dish.img)} alt="" loading="lazy" />
      <span className="sg-main">
        <span className="sg-name">{dish.name}</span>
        <span className="sg-sub">{dish.category}{dish.tag ? ` · ${dish.tag}` : ""}</span>
      </span>
      <span className="sg-price">{inr(dish.price)}</span>
      <button type="button" className="sg-add"
        onClick={(e) => { e.stopPropagation(); s.addToCart(dish.name); }}>
        Add
      </button>
    </li>
  );

  return (
    <div className="search-overlay" ref={overlayRef}>
      <div className="search-box">
        <i className="fa-solid fa-magnifying-glass search-ico" aria-hidden="true" />
        <label className="sr-only" htmlFor="searchInput">Search dishes</label>
        <input ref={inputRef} type="search" id="searchInput" autoComplete="off"
          placeholder='Search dishes… try "pizza" or "sweet"'
          value={s.query} onChange={(e) => s.setQuery(e.target.value)} />
        <button type="button" aria-label="Close search" onClick={() => s.setSearchOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
      <p className="search-hint">Popular right now: Pizza · Biryani · Burger</p>
      <ul className="suggestions">
        {!q && popular.map(item)}
        {q && results.length === 0 && <li className="sg-none">No dishes found for "{s.query}"</li>}
        {q && results.map(item)}
        {similar.length > 0 && <li className="sg-similar-head">You may also like</li>}
        {similar.map(item)}
      </ul>
    </div>
  );
}
