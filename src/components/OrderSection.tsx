import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { cartCount, cartSubtotal, cartSummary, useStore } from "../store/useStore";
import { breakdown, inr } from "../utils/pricing";
import { dishByNameCI, imgUrl } from "../data/dishes";
import { phoneFromUser } from "./AccountPanel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+ ()-]{10,15}$/;
const STEPS = ["Order received", "Preparing", "On the way", "Delivered"];

interface PlacedOrder { id: string; text: string }

// Total for the items as typed in the form ("Pasta × 2, Juice") — lets the
// estimate stay honest even when the customer edits the text by hand.
function typedItemsTotal(text: string): number | null {
  let total = 0;
  let matched = false;
  text.split(",").forEach((part) => {
    const m = part.trim().match(/^(.+?)(?:\s*[×x]\s*(\d+))?$/i);
    if (!m) return;
    const dish = dishByNameCI(m[1]);
    if (dish) {
      matched = true;
      total += dish.price * (m[2] ? parseInt(m[2], 10) : 1);
    }
  });
  return matched ? total : null;
}

export default function OrderSection() {
  const promoApplied = useStore((s) => s.promoApplied);
  const subtotal = useStore(cartSubtotal);
  const summary = useStore(cartSummary);
  const count = useStore(cartCount);
  const clearCart = useStore((s) => s.clearCart);
  const showToast = useStore((s) => s.showToast);
  const orderItemsText = useStore((s) => s.orderItemsText);
  const setOrderItemsText = useStore((s) => s.setOrderItemsText);
  const { user } = useAuth0();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("Cash on Delivery");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [step, setStep] = useState(1);
  const prefilled = useRef(false);

  // Keep the form's items/quantity in step with the cart (as the original
  // site did), unless an order was just placed.
  useEffect(() => { if (!placed) { setItems(summary); setQty(count || 1); } }, [summary, count, placed]);

  // A gallery "Order Now" for a non-menu item drops its name into the form.
  useEffect(() => {
    if (orderItemsText) { setItems(orderItemsText); setOrderItemsText(""); }
  }, [orderItemsText, setOrderItemsText]);

  // Prefill from the Auth0 profile once the user is known.
  useEffect(() => {
    if (user && !prefilled.current) {
      prefilled.current = true;
      if (user.name) setName((v) => v || user.name || "");
      if (user.email) setEmail((v) => v || user.email || "");
      const p = phoneFromUser(user);
      if (p) setPhone((v) => v || p);
    }
  }, [user]);

  // Advance the status tracker while the confirmation is on screen.
  useEffect(() => {
    if (!placed) return;
    setStep(1);
    const t1 = setTimeout(() => setStep(2), 20000);
    const t2 = setTimeout(() => setStep(3), 45000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [placed]);

  const typedTotal = useMemo(() => typedItemsTotal(items), [items]);
  const estimate = typedTotal !== null ? breakdown(typedTotal, promoApplied) : null;
  const shownTotal = estimate ? estimate.total : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast("Please enter your name");
    if (!EMAIL_RE.test(email)) return showToast("Please enter a valid email");
    if (!PHONE_RE.test(phone)) return showToast("Please enter a valid phone number");
    if (!items.trim()) return showToast("Your order is empty — add a dish from the menu");
    if (!address.trim()) return showToast("Please enter your delivery address");
    if (qty < 1 || qty > 50) return showToast("Quantity must be between 1 and 50");

    const total = shownTotal ?? breakdown(subtotal, promoApplied).total;
    const id = "FD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const eta = new Date(Date.now() + 40 * 60000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    setPlaced({
      id,
      text: `Order ${id} confirmed — ${items}. Total ${inr(total)} (${payment}). Arriving by about ${eta}.`,
    });
    clearCart();
  };

  const orderAgain = () => {
    setPlaced(null);
    setItems("");
    setQty(1);
  };

  return (
    <section className="order" id="Order">
      <h2><span>Order</span> Now</h2>
      <div className="order-main">
        <div className="order-image">
          <img src={imgUrl("order_image.png")} alt="Delivery rider with a food order" loading="lazy" />
        </div>

        {!placed ? (
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="fName">Name</label>
              <input id="fName" type="text" placeholder="Your name" autoComplete="name" required
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fEmail">Email</label>
              <input id="fEmail" type="email" placeholder="Your email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fPhone">Phone Number</label>
              <input id="fPhone" type="tel" placeholder="Your phone number" autoComplete="tel" required
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="fQty">Quantity</label>
              <input id="fQty" type="number" placeholder="How many" min={1} max={50} required
                value={qty} onChange={(e) => setQty(parseInt(e.target.value || "1", 10))} />
            </div>
            <div className="field field-wide">
              <label htmlFor="fItems">Your Order</label>
              <input id="fItems" type="text" placeholder="Food name — or add dishes from the menu" required
                value={items} onChange={(e) => setItems(e.target.value)} />
            </div>
            <div className="field field-wide">
              <label htmlFor="fAddress">Address</label>
              <input id="fAddress" type="text" placeholder="Your full delivery address" autoComplete="street-address" required
                value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="field field-wide">
              <label htmlFor="fNote">Delivery Note <span className="optional">(optional)</span></label>
              <input id="fNote" type="text" placeholder="e.g. Ring the bell, leave at the door"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <fieldset className="field field-wide pay-group">
              <legend>Payment</legend>
              {["Cash on Delivery", "UPI"].map((p) => (
                <label className="pay-option" key={p}>
                  <input type="radio" name="payment" value={p} checked={payment === p}
                    onChange={() => setPayment(p)} /> <span>{p}</span>
                </label>
              ))}
            </fieldset>
            <p className="order-total-line">
              Estimated total (incl. delivery): <strong>{shownTotal !== null ? inr(shownTotal) : "—"}</strong>
            </p>
            <button type="submit" className="btn-primary order-submit">Place Order</button>
            <p className="form-note">Front-end demo checkout — your order is confirmed on this page, no payment is taken.</p>
          </form>
        ) : (
          <div className="order-success" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <h3>Order placed!</h3>
            <p>{placed.text}</p>
            <ol className="status-steps" aria-label="Order status">
              {STEPS.map((label, i) => (
                <li key={label} className={i < step ? "done" : i === step ? "current" : undefined}>{label}</li>
              ))}
            </ol>
            <button type="button" className="btn-dark" onClick={orderAgain}>Order More</button>
          </div>
        )}
      </div>
    </section>
  );
}
