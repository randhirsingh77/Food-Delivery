import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Profile, Subscription, TiffinPlan } from "../api/types";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";

// Tiffin subscriptions on the profile page: prepaid MEAL CREDITS for the
// Ghar Jaisa Thali (never a money wallet). Subscribe, see today's status,
// skip or pause before the 9 PM cut-off; skipped/paused days extend the
// plan. The policy line is shown in full — unused meals expire, no refund,
// no auto-renewal.

const istKey = (d = new Date()) => new Date(d.getTime() + (5 * 60 + 30) * 60000).toISOString().slice(0, 10);
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const pretty = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default function TiffinSection({ profile }: { profile: Profile }) {
  const showToast = useStore((s) => s.showToast);
  const [plans, setPlans] = useState<TiffinPlan[]>([]);
  const [policy, setPolicy] = useState("");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("Cash on Delivery");
  const [skipDate, setSkipDate] = useState("");
  const [pauseDays, setPauseDays] = useState(3);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.tiffinPlans(), api.mySubscriptions()]);
      setPlans(p.plans);
      setPolicy(p.policy);
      setSubs(s);
    } catch { /* section stays quiet if the API is unreachable */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!address && profile.addresses[0]) {
      const a = profile.addresses[0];
      setAddress(`${a.line}, ${a.city}${a.pincode ? ` — ${a.pincode}` : ""}`);
    }
  }, [profile, address]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try { await fn(); showToast(okMsg); await load(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  const subscribe = (plan: TiffinPlan) => {
    if (!address.trim()) return showToast("Add a delivery address first");
    act(() => api.subscribe(plan.id, { address: address.trim(), paymentMethod: payment }), `${plan.name} started — first thali arrives tomorrow`);
  };

  const current = subs.filter((s) => ["active", "paused"].includes(s.status));
  const past = subs.filter((s) => !["active", "paused"].includes(s.status));
  const tomorrow = addDays(istKey(), 1);

  return (
    <section className="panel-card">
      <h3 className="panel-h">Tiffin subscription — Ghar Jaisa Thali</h3>
      <p className="dash-note">A home-style thali (4 rotis, dal, seasonal sabzi, rice, salad — no onion-garlic) delivered daily. You prepay for meals, not money: each delivery uses one meal credit.</p>

      {current.map((sub) => (
        <div key={sub._id} className="tiffin-plan">
          <p className="or-id">{sub.planName} · {sub.status === "paused" ? `Paused until ${pretty(sub.pausedUntil || sub.endDate)}` : sub.todayStatus === "delivered" ? "Today's thali is on its way" : sub.todayStatus === "skipped" ? "Today is skipped" : "Active"}</p>
          <p className="or-meta">
            {sub.mealsLeft} of {sub.mealsTotal} meals left · {pretty(sub.startDate)} → {pretty(sub.endDate)} · {inr(sub.pricePaid)} paid ({sub.paymentMethod})
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`skip-${sub._id}`}>Skip a day</label>
              <input id={`skip-${sub._id}`} type="date" value={skipDate} min={tomorrow} max={sub.endDate} onChange={(e) => setSkipDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`pause-${sub._id}`}>Pause for (days)</label>
              <select id={`pause-${sub._id}`} value={pauseDays} onChange={(e) => setPauseDays(parseInt(e.target.value, 10))}>
                {[2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          </div>
          <div className="tiffin-actions">
            <button type="button" className="btn-dark sm" disabled={busy || sub.status !== "active"}
              onClick={() => act(() => api.skipTiffinDay(sub.id || sub._id, tomorrow), "Tomorrow skipped — plan extended by a day")}>
              Skip tomorrow
            </button>
            <button type="button" className="btn-dark sm" disabled={busy || !skipDate || sub.status !== "active"}
              onClick={() => act(() => api.skipTiffinDay(sub.id || sub._id, skipDate), "Day skipped — plan extended by a day")}>
              Skip chosen day
            </button>
            {sub.status === "active" ? (
              <button type="button" className="btn-dark sm" disabled={busy}
                onClick={() => act(() => api.pauseTiffin(sub.id || sub._id, pauseDays), "Plan paused — end date extended")}>
                Pause plan
              </button>
            ) : (
              <button type="button" className="btn-primary sm" disabled={busy}
                onClick={() => act(() => api.resumeTiffin(sub.id || sub._id), "Plan resumed")}>
                Resume plan
              </button>
            )}
          </div>
          {sub.skippedDates.length > 0 && <p className="or-meta">Skipped: {sub.skippedDates.map(pretty).join(", ")}</p>}
        </div>
      ))}

      {current.length === 0 && (
        <>
          <div className="form-grid">
            <div className="field field-wide">
              <label htmlFor="tfAddr">Delivery address</label>
              <input id="tfAddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Room / flat, street, area" />
            </div>
            <div className="field">
              <label htmlFor="tfPay">Payment</label>
              <select id="tfPay" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option>Cash on Delivery</option>
                <option>UPI</option>
              </select>
            </div>
          </div>
          <ul className="order-list">
            {plans.map((plan) => (
              <li key={plan.id} className="order-row">
                <div className="or-main">
                  <p className="or-id">{plan.name} — {inr(plan.price)}</p>
                  <p className="or-meta">{plan.blurb} · {inr(Math.round(plan.price / plan.meals))} per meal</p>
                </div>
                <button type="button" className="btn-primary sm" disabled={busy} onClick={() => subscribe(plan)}>Subscribe</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && <p className="or-meta">Past plans: {past.map((s) => `${s.planName} (${s.status})`).join(", ")}</p>}
      {policy && <p className="diet-note">{policy}</p>}
    </section>
  );
}
