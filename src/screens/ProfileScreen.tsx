import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useProfile } from "../api/useProfile";
import type { Address, Order } from "../api/types";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";
import DashShell, { RateInput, StatusPill } from "../components/Dash";
import TiffinSection from "./TiffinSection";

function OrderRow({ order, onRated }: { order: Order; onRated: () => void }) {
  const openTrack = useStore((s) => s.openTrack);
  const showToast = useStore((s) => s.showToast);
  const [stars, setStars] = useState(5);
  const canRate = order.status === "delivered" && order.driverSub && !order.rating?.stars;

  const rate = async () => {
    try {
      await api.rate(order.orderId, stars);
      showToast("Thanks for rating your driver");
      onRated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save the rating");
    }
  };

  return (
    <li className="order-row">
      <div className="or-main">
        <p className="or-id">{order.orderId} <StatusPill status={order.status} /></p>
        <p className="or-items">{order.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
        <p className="or-meta">{new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {inr(order.amounts.total)} · {order.paymentMethod}</p>
        {order.rating?.stars ? (
          <p className="or-meta">You rated the driver {"★".repeat(order.rating.stars)}</p>
        ) : canRate ? (
          <span className="or-rate">
            Rate your driver: <RateInput value={stars} onChange={setStars} />
            <button type="button" className="btn-dark sm" onClick={rate}>Submit</button>
          </span>
        ) : null}
      </div>
      {["packing", "on_the_way", "preparing", "received"].includes(order.status) && (
        <button type="button" className="btn-primary sm" onClick={() => openTrack(order.orderId)}>
          <i className="fa-solid fa-location-dot" aria-hidden="true" /> Track
        </button>
      )}
      {order.status === "delivered" && (
        <button type="button" className="btn-dark sm" onClick={() => openTrack(order.orderId)}>Details</button>
      )}
    </li>
  );
}

export default function ProfileScreen() {
  const { profile, setProfile, loading, error } = useProfile();
  const showToast = useStore((s) => s.showToast);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<Address>({ label: "Home", line: "", city: "New Delhi", pincode: "" });

  const loadOrders = async () => { try { setOrders(await api.myOrders()); } catch { /* keep quiet */ } };
  useEffect(() => { loadOrders(); }, []);
  useEffect(() => {
    if (profile) { setName(profile.name || ""); setPhone(profile.phone || ""); }
  }, [profile]);

  if (loading) return <DashShell title="Your profile" profile={null}><p className="dash-note">Loading…</p></DashShell>;
  if (error || !profile) return <DashShell title="Your profile" profile={null}><p className="dash-note">{error || "Please login first."}</p></DashShell>;

  const saveProfile = async () => {
    try { setProfile(await api.updateProfile({ name, phone })); showToast("Profile updated"); }
    catch (e) { showToast(e instanceof Error ? e.message : "Could not save"); }
  };

  const addAddress = async () => {
    if (!addr.line.trim()) return showToast("Enter the address line first");
    try {
      setProfile(await api.addAddress(addr));
      setAddr({ label: "Home", line: "", city: "New Delhi", pincode: "" });
      showToast("Address saved");
    } catch (e) { showToast(e instanceof Error ? e.message : "Could not save address"); }
  };

  const delAddress = async (id?: string) => {
    if (!id) return;
    try { setProfile(await api.deleteAddress(id)); } catch { /* ignore */ }
  };

  const initial = (profile.name || profile.email || "U").trim().charAt(0).toUpperCase();

  return (
    <DashShell title="Your profile" subtitle="Your details, saved addresses and orders." profile={profile}>
      <div className="dash-grid">
        <section className="panel-card">
          <div className="acc-user">
            {profile.picture
              ? <img className="acc-avatar-lg" src={profile.picture} alt="" />
              : <span className="acc-initial-lg">{initial}</span>}
            <div>
              <p className="acc-name">{profile.name || "Foodie user"}</p>
              <p className="acc-mail">{profile.email}</p>
              <p className="acc-mail">Role: <strong>{profile.role}</strong></p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pName">Name</label>
              <input id="pName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="field">
              <label htmlFor="pPhone">Phone</label>
              <input id="pPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" />
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={saveProfile}>Save changes</button>

        </section>

        <section className="panel-card">
          <h3 className="panel-h">Saved addresses</h3>
          {profile.addresses.length === 0 && <p className="dash-note">No addresses yet — add one for faster checkout.</p>}
          <ul className="addr-list">
            {profile.addresses.map((a) => (
              <li key={a._id} className="addr-card">
                <div>
                  <strong>{a.label}</strong>
                  <p>{a.line}, {a.city}{a.pincode ? ` — ${a.pincode}` : ""}</p>
                </div>
                <button type="button" className="icon-btn" aria-label={`Delete ${a.label} address`} onClick={() => delAddress(a._id)}>
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="aLabel">Label</label>
              <input id="aLabel" value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })} placeholder="Home / Office" />
            </div>
            <div className="field">
              <label htmlFor="aPin">Pincode</label>
              <input id="aPin" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} placeholder="110001" />
            </div>
            <div className="field field-wide">
              <label htmlFor="aLine">Address</label>
              <input id="aLine" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value })} placeholder="Flat, street, area" />
            </div>
            <div className="field field-wide">
              <label htmlFor="aCity">City</label>
              <input id="aCity" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
            </div>
          </div>
          <button type="button" className="btn-dark" onClick={addAddress}>Add address</button>
        </section>
      </div>

      <TiffinSection profile={profile} />

      <section className="panel-card">
        <h3 className="panel-h">My orders</h3>
        {orders.length === 0 && <p className="dash-note">No orders yet. Your orders will appear here.</p>}
        <ul className="order-list">
          {orders.map((o) => <OrderRow key={o.orderId} order={o} onRated={loadOrders} />)}
        </ul>
      </section>
    </DashShell>
  );
}
