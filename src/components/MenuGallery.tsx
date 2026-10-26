import { useEffect, useState } from "react";
import { CATEGORIES, DIETARY_FILTERS, DISHES, GALLERY, imgUrl, isHighProtein, matchesDietary, matchesQuery, type DietaryFilter, type Dish } from "../data/dishes";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";
import { api } from "../api/client";
import type { MenuStateRow } from "../api/types";

function Stars() {
  return (
    <p className="stars" aria-label="Rated 4.5 out of 5">
      <i className="fa-solid fa-star" /><i className="fa-solid fa-star" />
      <i className="fa-solid fa-star" /><i className="fa-solid fa-star" />
      <i className="fa-solid fa-star-half-stroke" />
    </p>
  );
}

function DishCard({ dish, outOfStock }: { dish: Dish; outOfStock?: boolean }) {
  const favs = useStore((s) => s.favs);
  const toggleFav = useStore((s) => s.toggleFav);
  const addToCart = useStore((s) => s.addToCart);
  const isFav = favs.includes(dish.name);

  return (
    <article className={`menu-card${outOfStock ? " oos" : ""}`} id={`dish-${dish.name}`}>
      <div className="menu-image"><img src={imgUrl(dish.img)} alt={dish.name} loading="lazy" /></div>
      {outOfStock && <span className="oos-tag">Out of stock</span>}
      {dish.tag && <span className="dish-tag">{dish.tag}</span>}
      <span className={`veg-badge ${dish.veg ? "veg" : "nonveg"}`}
        title={dish.veg ? "Vegetarian" : "Non-vegetarian"}
        aria-label={dish.veg ? "Vegetarian" : "Non-vegetarian"}>
        <span />
      </span>
      <button type="button" className={`fav-btn${isFav ? " active" : ""}`}
        aria-label={`Save ${dish.name} to favourites`} aria-pressed={isFav}
        onClick={() => toggleFav(dish.name)}>
        <i className="fa-solid fa-heart" aria-hidden="true" />
      </button>
      <div className="menu-info">
        <h3>{dish.name}</h3>
        <p>{dish.blurb}</p>
        <div className="diet-badges">
          {dish.dietary.jain && <span className="diet-badge">Jain</span>}
          {dish.dietary.sattvic && <span className="diet-badge">Sattvic</span>}
          {dish.dietary.noOnionGarlic && <span className="diet-badge">No onion-garlic</span>}
          {isHighProtein(dish) && <span className="diet-badge protein">High protein</span>}
        </div>
        <p className="dish-nutrition">{dish.nutritionPerServing.kcal} kcal · {dish.nutritionPerServing.proteinG} g protein</p>
        {dish.allergens.length > 0 && <p className="dish-allergens">Contains: {dish.allergens.join(", ")}</p>}
        <p className="price">{inr(dish.price)}.00</p>
        <Stars />
        <button type="button" className="btn-dark order-add" disabled={outOfStock}
          onClick={() => addToCart(dish.name)}>
          {outOfStock ? "Unavailable" : "Order Now"}
        </button>
      </div>
    </article>
  );
}

// The menu: category chips + dietary chips + the dish grid. Filtering
// combines the active chips, the favourites-only toggle and the current
// search text. Kitchen corrections to dietary/nutrition data arrive via
// the menu-state API and override the built-in dish data.
export function MenuSection() {
  const category = useStore((s) => s.category);
  const setCategory = useStore((s) => s.setCategory);
  const favsOnly = useStore((s) => s.favsOnly);
  const favs = useStore((s) => s.favs);
  const query = useStore((s) => s.query);
  const [stock, setStock] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, MenuStateRow>>({});
  const [diet, setDiet] = useState<DietaryFilter>("all");

  // Kitchen availability + dietary/nutrition data — refreshed on mount.
  useEffect(() => {
    api.menuState().then((rows) => {
      const stockMap: Record<string, boolean> = {};
      const metaMap: Record<string, MenuStateRow> = {};
      rows.forEach((r) => { stockMap[r.name] = r.available; metaMap[r.name] = r; });
      setStock(stockMap);
      setMeta(metaMap);
    }).catch(() => { /* menu still works without stock data */ });
  }, []);

  const effective = (d: Dish): Dish => {
    const m = meta[d.name];
    if (!m) return d;
    return {
      ...d,
      dietary: m.dietary || d.dietary,
      allergens: m.allergens || d.allergens,
      nutritionPerServing: m.nutritionPerServing || d.nutritionPerServing,
    };
  };

  const visible = DISHES.map(effective).filter(
    (d) =>
      (category === "All" || d.category === category) &&
      (!favsOnly || favs.includes(d.name)) &&
      matchesDietary(d, diet) &&
      matchesQuery(d, query.trim().toLowerCase())
  );

  return (
    <section className="menu" id="Menu">
      <h2>Our <span>Menu</span></h2>
      <div className="chips" role="group" aria-label="Filter menu by category">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="chips diet-chips" role="group" aria-label="Filter menu by dietary need">
        {DIETARY_FILTERS.map((f) => (
          <button key={f.key} type="button" className={`chip diet${diet === f.key ? " active" : ""}`}
            onClick={() => setDiet(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="diet-note">Nutrition and dietary details are kitchen-declared and approximate; cross-contact is possible in a shared kitchen — please check with us for severe allergies.</p>
      {visible.length === 0 && <p className="no-results">No dishes match. Try another name or category.</p>}
      <div className="menu-grid">
        {visible.map((d) => <DishCard key={d.name} dish={d} outOfStock={stock[d.name] === false} />)}
      </div>
    </section>
  );
}

export function Gallery() {
  const addToCart = useStore((s) => s.addToCart);
  const setOrderItemsText = useStore((s) => s.setOrderItemsText);
  const showToast = useStore((s) => s.showToast);

  const order = (item: (typeof GALLERY)[number]) => {
    if (item.dish) {
      addToCart(item.dish);
    } else {
      // Not a menu dish — put it on the order form, like the original site.
      setOrderItemsText(item.title);
      showToast(`${item.title} added to your order — complete the form below`);
      document.querySelector("#Order")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="gallery" id="Gallery">
      <h2>Our <span>Gallery</span></h2>
      <div className="gallery-grid">
        {GALLERY.map((g) => (
          <figure className="gallery-item" key={g.title}>
            <img src={imgUrl(g.img)} alt={g.title} loading="lazy" />
            <figcaption>
              <h3>{g.title}</h3>
              <p>{g.text}</p>
              <button type="button" className="btn-primary gallery-order" onClick={() => order(g)}>
                Order Now
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
