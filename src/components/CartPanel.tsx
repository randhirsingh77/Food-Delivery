import { useState } from "react";
import { cartSubtotal, useStore } from "../store/useStore";
import { breakdown, inr, FREE_DELIVERY_ABOVE, PROMO } from "../utils/pricing";
import { dishByName } from "../data/dishes";

// The cart dropdown: line items with quantity steppers, promo code,
// price breakdown and the free-delivery progress note.
export default function CartPanel() {
  const s = useStore();
  const subtotal = useStore(cartSubtotal);
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const entries = Object.entries(s.cart);
  const b = breakdown(subtotal, s.promoApplied);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (code === PROMO.code) {
      if (subtotal >= PROMO.minSubtotal) {
        s.setPromoApplied(true);
        setPromoMsg({ text: `${PROMO.code} applied — 50% off up to ₹100.`, ok: true });
      } else {
        setPromoMsg({ text: `${PROMO.code} needs a subtotal of ${inr(PROMO.minSubtotal)} or more.`, ok: false });
      }
    } else {
      setPromoMsg({ text: "That code doesn't look right.", ok: false });
    }
  };

  const checkout = () => {
    s.setCartOpen(false);
    document.querySelector("#Order")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <aside className="cart-panel" aria-label="Your cart">
      <div className="cart-head">
        <h2>Your Cart</h2>
        <button type="button" aria-label="Close cart" onClick={() => s.setCartOpen(false)}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="cart-empty">Your cart is empty. Add something tasty from the menu.</p>
      ) : (
        <>
          <ul className="cart-items">
            {entries.map(([name, qty]) => {
              const dish = dishByName(name);
              if (!dish) return null;
              return (
                <li key={name}>
                  <span className="ci-name">{name}</span>
                  <span className="qty-controls">
                    <button type="button" aria-label={`Remove one ${name}`} onClick={() => s.setQty(name, qty - 1)}>−</button>
                    <span>{qty}</span>
                    <button type="button" aria-label={`Add one ${name}`} onClick={() => s.setQty(name, qty + 1)}>+</button>
                  </span>
                  <span className="ci-price">{inr(dish.price * qty)}</span>
                </li>
              );
            })}
          </ul>

          <div className="cart-foot">
            <div className="promo-row">
              <label className="sr-only" htmlFor="promoInput">Promo code</label>
              <input id="promoInput" type="text" placeholder="Promo code (try FOODIE50)" autoComplete="off"
                value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
              <button type="button" className="btn-dark" onClick={applyPromo}>Apply</button>
            </div>
            {promoMsg && <p className={`promo-msg ${promoMsg.ok ? "ok" : "err"}`}>{promoMsg.text}</p>}
            <dl className="price-rows">
              <div><dt>Subtotal</dt><dd>{inr(b.subtotal)}</dd></div>
              {b.discount > 0 && <div><dt>Discount (FOODIE50)</dt><dd>−{inr(b.discount)}</dd></div>}
              <div><dt>Delivery</dt><dd>{b.delivery === 0 ? "FREE" : inr(b.delivery)}</dd></div>
              <div className="grand"><dt>Total</dt><dd>{inr(b.total)}</dd></div>
            </dl>
            <p className="free-del-note">
              {b.delivery > 0
                ? `Add ${inr(FREE_DELIVERY_ABOVE - (b.subtotal - b.discount))} more for FREE delivery`
                : "You have got FREE delivery on this order"}
            </p>
            <button type="button" className="btn-primary" onClick={checkout}>Checkout · {inr(b.total)}</button>
          </div>
        </>
      )}
    </aside>
  );
}
