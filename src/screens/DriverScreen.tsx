import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useProfile } from "../api/useProfile";
import type { Order } from "../api/types";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";
import DashShell, { Stars, StatusPill } from "../components/Dash";

// Driver dashboard: duty toggle, orders ready for pickup, the active
// delivery, and the money + rating the driver has earned (demo wallet).
export default function DriverScreen() {
  const { profile, setProfile, loading } = useProfile();
  const showToast = useStore((s) => s.showToast);
  const openTrack = useStore((s) => s.openTrack);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setOrders(await api.queue()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load deliveries"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) return <DashShell title="Driver dashboard" profile={null}><p className="dash-note">Loading…</p></DashShell>;

  const mine = orders.filter((o) => o.driverSub === profile.sub);
  const pool = orders.filter((o) => o.status === "packing" && !o.driverSub);
  const active = mine.filter((o) => ["packing", "on_the_way"].includes(o.status));
  const d = profile.driver;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); showToast(ok); load(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Action failed"); }
  };

  const toggleDuty = async () => {
    try {
      const p = await api.updateProfile({ driver: { available: !d.available } });
      setProfile(p);
    } catch { showToast("Could not change duty status"); }
  };

  return (
    <DashShell title="Driver dashboard" subtitle="Accept packed orders, deliver them, and watch your earnings grow." profile={profile}>
      {error && <p className="form-err" role="alert">{error}</p>}

      <section className="panel-card driver-head">
        {d.photoUrl
          ? <img className="driver-photo" src={d.photoUrl} alt="" />
          : <span className="acc-initial-lg">{(profile.name || "D").charAt(0)}</span>}
        <div className="driver-id">
          <p className="acc-name">{profile.name || "Driver"}</p>
          <p className="acc-mail">{d.vehicle || "Vehicle not set — add it in your profile"}</p>
          <p className="acc-mail"><Stars value={d.ratingAvg} /> {d.ratingAvg} · {d.ratingCount} ratings</p>
        </div>
        <div className="driver-stats">
          <div><p className="stat-label">Earnings</p><p className="stat-value sm">{inr(d.earnings)}</p></div>
          <div><p className="stat-label">Deliveries</p><p className="stat-value sm">{d.deliveries}</p></div>
          <button type="button" role="switch" aria-checked={d.available} className={`switch lg${d.available ? " on" : ""}`} onClick={toggleDuty}>
            <span className="knob" />
          </button>
          <span className={d.available ? "stock-on" : "stock-off"}>{d.available ? "On duty" : "Off duty"}</span>
        </div>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">My active deliveries ({active.length})</h3>
        {active.length === 0 && <p className="dash-note">Nothing in hand. Accept an order below.</p>}
        <ul className="order-list">
          {active.map((o) => (
            <li key={o.orderId} className="order-row">
              <div className="or-main">
                <p className="or-id">{o.orderId} <StatusPill status={o.status} /></p>
                <p className="or-items">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
                <p className="or-meta">{o.customer.name} · {o.address} · {inr(o.amounts.total)}</p>
              </div>
              <div className="or-actions">
                {o.status === "packing" && (
                  <button type="button" className="btn-primary sm" onClick={() => act(() => api.advance(o.orderId), "Picked up — on the way")}>Picked up</button>
                )}
                {o.status === "on_the_way" && (
                  <>
                    <button type="button" className="btn-dark sm" onClick={() => openTrack(o.orderId)}>Map</button>
                    <button type="button" className="btn-primary sm" onClick={() => act(() => api.advance(o.orderId), "Delivered — ₹40 added to your earnings")}>Delivered</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">Ready for pickup ({pool.length})</h3>
        {pool.length === 0 && <p className="dash-note">No packed orders waiting right now.</p>}
        <ul className="order-list">
          {pool.map((o) => (
            <li key={o.orderId} className="order-row">
              <div className="or-main">
                <p className="or-id">{o.orderId} <StatusPill status={o.status} /></p>
                <p className="or-items">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
                <p className="or-meta">{o.address} · {inr(o.amounts.total)} · earn ₹40</p>
              </div>
              <button type="button" className="btn-primary sm" onClick={() => act(() => api.accept(o.orderId), "Order is yours — pick it up")}>Accept</button>
            </li>
          ))}
        </ul>
      </section>
    </DashShell>
  );
}
