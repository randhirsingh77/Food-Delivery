import { CATEGORIES, DISHES, GALLERY, imgUrl, matchesQuery, type Dish } from "../data/dishes";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";

function Stars() {
  return (
    <p className="stars" aria-label="Rated 4.5 out of 5">
      <i className="fa-solid fa-star" /><i className="fa-solid fa-star" />
      <i className="fa-solid fa-star" /><i className="fa-solid fa-star" />
      <i className="fa-solid fa-star-half-stroke" />
    </p>
  );
}

function DishCard({ dish }: { dish: Dish }) {
  const favs = useStore((s) => s.favs);
  const toggleFav = useStore((s) => s.toggleFav);
  const addToCart = useStore((s) => s.addToCart);
  const isFav = favs.includes(dish.name);

  return (
    <article className="menu-card" id={`dish-${dish.name}`}>
      <div className="menu-image"><img src={imgUrl(dish.img)} alt={dish.name} loading="lazy" /></div>
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
        <p className="price">{inr(dish.price)}.00</p>
        <Stars />
        <button type="button" className="btn-dark order-add" onClick={() => addToCart(dish.name)}>
          Order Now
        </button>
      </div>
    </article>
  );
}

// The menu: category chips + the dish grid. Filtering combines the active
// chip, the favourites-only toggle and the current search text.
export function MenuSection() {
  const category = useStore((s) => s.category);
  const setCategory = useStore((s) => s.setCategory);
  const favsOnly = useStore((s) => s.favsOnly);
  const favs = useStore((s) => s.favs);
  const query = useStore((s) => s.query);

  const visible = DISHES.filter(
    (d) =>
      (category === "All" || d.category === category) &&
      (!favsOnly || favs.includes(d.name)) &&
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
      {visible.length === 0 && <p className="no-results">No dishes match. Try another name or category.</p>}
      <div className="menu-grid">
        {visible.map((d) => <DishCard key={d.name} dish={d} />)}
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
