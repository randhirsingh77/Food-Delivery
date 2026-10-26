import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useProfile } from "../api/useProfile";
import { DISHES } from "../data/dishes";
import type { GroupCart } from "../api/types";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";
import DashShell from "../components/Dash";

// Group ordering: the host opens a shared cart, everyone adds their own
// dishes from their own phone, the host locks and pays, and the app
// shows exactly what each person owes the host (split in paise on the
// server, so the shares always add up). Settlement is person-to-person
// via UPI — the host's own UPI id is on the cart.

const paise = (p: number) =>
  "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });

export default function GroupCartScreen() {
  const { profile, loading } = useProfile();
  const code = useStore((s) => s.groupCode);
  const openGroup = useStore((s) => s.openGroup);
  const setGroupCode = useStore((s) => s.setGroupCode);
  const openTrack = useStore((s) => s.openTrack);
  const setView = useStore((s) => s.setView);
  const showToast = useStore((s) => s.showToast);

  const [cart, setCart] = useState<GroupCart | null>(null);
  const [mine, setMine] = useState<GroupCart[]>([]);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [error, setError] = useState("");
  const [upiId, setUpiId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [dishName, setDishName] = useState(DISHES[0].name);
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("Cash on Delivery");
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(async () => {
    try { setMine(await api.myGroupCarts()); } catch { /* signed-out handled below */ }
  }, []);

  const loadCart = useCallback(async () => {
    if (!code) return;
    try {
      setCart(await api.getGroupCart(code));
      setNeedsJoin(false);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load the cart";
      if (msg.includes("Join this cart")) setNeedsJoin(true);
      else setError(msg);
    }
  }, [code]);

  useEffect(() => { if (profile && !code) loadMine(); }, [profile, code, loadMine]);
  useEffect(() => {
    if (!code || !profile) return;
    loadCart();
    const t = setInterval(loadCart, 4000);
    return () => clearInterval(t);
  }, [code, profile, loadCart]);

  if (loading) return <DashShell title="Group order" profile={null}><p className="dash-note">Loading…</p></DashShell>;
  if (!profile) {
    return (
      <DashShell title="Group order" profile={null}>
        <p className="dash-note">Group orders need everyone signed in, so each person's dishes — and their share — are theirs.</p>
        <button type="button" className="btn-primary" onClick={() => setView("auth")}>Login to continue</button>
      </DashShell>
    );
  }

  const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showToast(okMsg);
      await loadCart();
    } catch (e) { showToast(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  const startCart = async () => {
    setBusy(true);
    try {
      const c = await api.createGroupCart(upiId.trim() || undefined);
      openGroup(c.code);
      showToast(`Group cart ${c.code} started — share the link`);
    } catch (e) { showToast(e instanceof Error ? e.message : "Could not start the cart"); }
    setBusy(false);
  };

  const join = async (target: string) => {
    const c = target.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      await api.joinGroupCart(c);
      openGroup(c);
      showToast("Joined the group cart");
    } catch (e) { showToast(e instanceof Error ? e.message : "Could not join"); }
    setBusy(false);
  };

  const checkout = async () => {
    if (!cart) return;
    if (!address.trim()) return showToast("Enter the delivery address first");
    setBusy(true);
    try {
      const { order } = await api.checkoutGroupCart(cart.code, {
        address: address.trim(), paymentMethod: payment,
        name: profile.name, phone: profile.phone,
      });
      showToast(`Group order ${order.orderId} placed`);
      await loadCart();
    } catch (e) { showToast(e instanceof Error ? e.message : "Checkout failed"); }
    setBusy(false);
  };

  // ---- No cart selected: start / join / my carts -------------------------
  if (!code) {
    return (
      <DashShell title="Group order" subtitle="Order together: everyone adds their own dishes, one person pays, the app splits the bill." profile={profile}>
        {error && <p className="form-err" role="alert">{error}</p>}
        <div className="dash-grid">
          <section className="panel-card">
            <h3 className="panel-h">Start a group order</h3>
            <p className="dash-note">You will be the host: you lock the cart and pay. Add your UPI id so friends can settle their share with you directly.</p>
            <div className="field">
              <label htmlFor="gUpi">Your UPI id (optional)</label>
              <input id="gUpi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfc" autoComplete="off" />
            </div>
            <button type="button" className="btn-primary" onClick={startCart} disabled={busy}>{busy ? "Starting…" : "Start group order"}</button>
          </section>
          <section className="panel-card">
            <h3 className="panel-h">Join with a code</h3>
            <div className="field">
              <label htmlFor="gCode">Cart code</label>
              <input id="gCode" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. K7QX2M" autoComplete="off" maxLength={8} />
            </div>
            <button type="button" className="btn-dark" onClick={() => join(joinCode)} disabled={busy}>Join cart</button>
          </section>
        </div>
        {mine.length > 0 && (
          <section className="panel-card">
            <h3 className="panel-h">Your group carts</h3>
            <ul className="order-list">
              {mine.map((c) => (
                <li key={c._id} className="order-row">
                  <div className="or-main">
                    <p className="or-id">{c.code} · {c.status}</p>
                    <p className="or-meta">{c.participants.length} people · {c.items.reduce((s, i) => s + i.qty, 0)} items{c.hostSub === profile.sub ? " · you host" : ""}</p>
                  </div>
                  <button type="button" className="btn-primary sm" onClick={() => openGroup(c.code)}>Open</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DashShell>
    );
  }

  // ---- Invite link landed, not yet a participant ------------------------
  if (needsJoin) {
    return (
      <DashShell title="Group order" profile={profile}>
        <section className="panel-card">
          <h3 className="panel-h">You have been invited to cart {code}</h3>
          <p className="dash-note">Join to add your dishes. The host pays at the end; the app shows your share.</p>
          <button type="button" className="btn-primary" onClick={() => join(code)} disabled={busy}>Join this cart</button>{" "}
          <button type="button" className="btn-dark" onClick={() => setGroupCode("")}>Not now</button>
        </section>
      </DashShell>
    );
  }

  if (!cart) {
    return <DashShell title="Group order" profile={profile}><p className="dash-note">{error || "Loading the cart…"}</p></DashShell>;
  }

  const isHost = cart.hostSub === profile.sub;
  const totalPaise = cart.splits.reduce((s, x) => s + x.amountPaise, 0);
  const shareLink = `${window.location.origin}${window.location.pathname}#group=${cart.code}`;
  const upiLink = (name: string, amountPaise: number) =>
    `upi://pay?pa=${encodeURIComponent(cart.hostUpiId)}&pn=${encodeURIComponent(name)}&am=${(amountPaise / 100).toFixed(2)}&cu=INR`;

  return (
    <DashShell title={`Group cart ${cart.code}`} subtitle={cart.status === "open" ? "Open — everyone can add dishes." : cart.status === "locked" ? "Locked by the host — ready to check out." : cart.status === "ordered" ? "Ordered — settle your share with the host." : "This cart has expired."} profile={profile}>
      {error && <p className="form-err" role="alert">{error}</p>}
      <section className="panel-card">
        <h3 className="panel-h">Share this cart</h3>
        <p className="dash-note">Code <strong>{cart.code}</strong> · Link: <span className="or-meta">{shareLink}</span></p>
        <button type="button" className="btn-dark sm" onClick={() => { navigator.clipboard?.writeText(shareLink).catch(() => {}); showToast("Link copied"); }}>Copy link</button>{" "}
        <button type="button" className="btn-dark sm" onClick={() => setGroupCode("")}>My group carts</button>
        <p className="dash-note">In the cart: {cart.participants.map((p) => p.name || "Guest").join(", ")}</p>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">Dishes ({cart.items.reduce((s, i) => s + i.qty, 0)})</h3>
        {cart.items.length === 0 && <p className="dash-note">Nothing yet — add the first dish below.</p>}
        <ul className="group-items">
          {cart.items.map((i) => (
            <li key={i._id} className="group-item">
              <span>{i.name} × {i.qty} <span className="or-meta">— {i.addedBySub === profile.sub ? "you" : i.addedByName || "Guest"}</span></span>
              <span>{inr(i.priceSnapshot * i.qty)}
                {cart.status === "open" && (isHost || i.addedBySub === profile.sub) && (
                  <> <button type="button" className="btn-dark sm" disabled={busy} onClick={() => act(() => api.removeGroupItem(cart.code, i._id))}>Remove</button></>
                )}
              </span>
            </li>
          ))}
        </ul>
        {cart.status === "open" && (
          <div className="form-grid">
            <div className="field">
              <label htmlFor="gDish">Dish</label>
              <select id="gDish" value={dishName} onChange={(e) => setDishName(e.target.value)}>
                {DISHES.map((d) => <option key={d.name} value={d.name}>{d.name} — {inr(d.price)}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="gQty">Quantity</label>
              <input id="gQty" type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))} />
            </div>
          </div>
        )}
        {cart.status === "open" && (
          <button type="button" className="btn-primary" disabled={busy} onClick={() => act(() => api.addGroupItem(cart.code, dishName, qty), "Added to the group cart")}>Add my dish</button>
        )}
      </section>

      <section className="panel-card">
        <h3 className="panel-h">The split</h3>
        {cart.splits.length === 0 ? (
          <p className="dash-note">Shares appear once dishes are added. Delivery and any discount are shared in proportion to each person's dishes.</p>
        ) : (
          <>
            <ul className="split-list">
              {cart.splits.map((sp) => (
                <li key={sp.sub} className="split-row">
                  <span>{sp.sub === profile.sub ? "You" : sp.name || "Guest"}{sp.sub === cart.hostSub ? " (host)" : ""}</span>
                  <span><strong>{paise(sp.amountPaise)}</strong>
                    {cart.hostUpiId && sp.sub !== cart.hostSub && (
                      <> · <a href={upiLink(sp.name || "Foodie host", sp.amountPaise)}>Pay host via UPI</a></>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="dash-note">Total {paise(totalPaise)} — the host pays the full amount; everyone else settles their share with the host.</p>
          </>
        )}

        {isHost && cart.status === "open" && (
          <button type="button" className="btn-primary" disabled={busy || cart.items.length === 0} onClick={() => act(() => api.lockGroupCart(cart.code), "Cart locked")}>Lock the cart</button>
        )}
        {isHost && cart.status === "locked" && (
          <>
            <div className="form-grid">
              <div className="field field-wide">
                <label htmlFor="gAddr">Delivery address</label>
                <input id="gAddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where should the group order go?" />
              </div>
              <div className="field">
                <label htmlFor="gPay">Payment</label>
                <select id="gPay" value={payment} onChange={(e) => setPayment(e.target.value)}>
                  <option>Cash on Delivery</option>
                  <option>UPI</option>
                </select>
              </div>
            </div>
            <button type="button" className="btn-primary" disabled={busy} onClick={checkout}>{busy ? "Placing…" : "Place the group order"}</button>
          </>
        )}
        {!isHost && cart.status === "locked" && <p className="dash-note">Waiting for the host to check out.</p>}
        {cart.status === "ordered" && cart.orderId && (
          <p className="dash-note">Order <strong>{cart.orderId}</strong> is with the kitchen.{" "}
            <button type="button" className="btn-dark sm" onClick={() => openTrack(cart.orderId)}>Track it</button>
          </p>
        )}
      </section>
    </DashShell>
  );
}
