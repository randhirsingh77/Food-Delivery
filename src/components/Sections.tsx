import { imgUrl } from "../data/dishes";

// Is the kitchen open right now? (11 AM – 11 PM, every day.)
function openState() {
  const h = new Date().getHours();
  return h >= 11 && h < 23;
}

export function Hero() {
  const open = openState();
  return (
    <section className="hero" id="Home">
      <div className="hero-text">
        <h1>Get Fresh <span>Food</span><br />in an Easy Way</h1>
        <ul className="info-strip" aria-label="Restaurant information">
          <li><i className="fa-solid fa-star" aria-hidden="true" /> 4.5 rating</li>
          <li><i className="fa-solid fa-clock" aria-hidden="true" /> 30–40 min delivery</li>
          <li><i className="fa-solid fa-indian-rupee-sign" aria-hidden="true" /> Free delivery over ₹499</li>
          <li className={`open-badge${open ? "" : " closed"}`}>
            <span className="dot" /> {open ? "Open now · till 11 PM" : "Closed · opens 11 AM"}
          </li>
        </ul>
        <p>
          Hot, fresh and made to order — Foodie brings your favourite burgers, pizzas,
          biryani and more straight to your door in New Delhi. Pick a dish, add it to
          your cart, and your order is placed in under a minute.
        </p>
        <p className="offer-banner">
          <i className="fa-solid fa-tag" aria-hidden="true" /> 50% OFF up to ₹100 on orders
          above ₹299 — code <strong>FOODIE50</strong>
        </p>
        <a href="#Menu" className="btn-primary hero-btn">
          Order Now <i className="fa-solid fa-angle-right" aria-hidden="true" />
        </a>
      </div>
      <div className="hero-image">
        <img src={imgUrl("main_img.png")} alt="A burger with fries and a drink" fetchPriority="high" />
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="about" id="About">
      <div className="about-image">
        <img src={imgUrl("Food-Plate.png")} alt="A plated dish of grilled food with vegetables" loading="lazy" />
      </div>
      <div className="about-text">
        <h2><span>About</span> Us</h2>
        <h3>Why choose us?</h3>
        <p>
          Every dish at Foodie is cooked fresh when you order — no frozen shortcuts.
          We use quality ingredients, keep our kitchen hygiene-first, and pack every
          order so it reaches you hot. Fair prices, honest portions and delivery
          that respects your time: that is the whole idea.
        </p>
        <ul className="about-points">
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Open daily, 11:00 AM – 11:00 PM</li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Delivery across New Delhi in 30–40 minutes</li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Pay with UPI or cash on delivery</li>
        </ul>
        <a href="#Order" className="btn-primary">Order Now</a>
      </div>
    </section>
  );
}
