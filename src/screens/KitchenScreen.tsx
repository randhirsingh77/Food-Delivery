import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useProfile } from "../api/useProfile";
import { DISHES, type Dish } from "../data/dishes";
import type { DishMetaData, DriverSummary, MenuStateRow, Order } from "../api/types";
import { inr } from "../utils/pricing";
import { useStore } from "../store/useStore";
import DashShell, { StatusPill } from "../components/Dash";

// Kitchen (manager) view: the live order queue with the next-step button
// for each order, driver assignment, and dish availability (out of stock)
// toggles that instantly reflect on the menu.
const NEXT_LABEL: Record<string, string> = { received: "Start preparing", preparing: "Mark packed", packing: "Waiting for driver", on_the_way: "On the way" };

// Editor for one dish's dietary flags + nutrition (kitchen-declared
// estimates shown on the menu). Saving writes through the menu-state API;
// the server stores it as the dish's override.
function DishMetaEditor({ dish, row }: { dish: Dish; row?: MenuStateRow }) {
  const showToast = useStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [dietary, setDietary] = useState(row?.dietary || dish.dietary);
  const [nutrition, setNutrition] = useState(row?.nutritionPerServing || dish.nutritionPerServing);
  const [allergens, setAllergens] = useState((row?.allergens || dish.allergens).join(", "));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const meta: DishMetaData = {
        dietary,
        nutritionPerServing: nutrition,
        allergens: allergens.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean),
      };
      await api.setDishMeta(dish.name, meta);
      showToast(`${dish.name} details saved`);
    } catch { showToast("Could not save dish details"); }
    setBusy(false);
  };

  const num = (key: keyof DishMetaData["nutritionPerServing"]) => (
    <input type="number" min={0} value={nutrition[key]} aria-label={`${dish.name} ${key}`}
      onChange={(e) => setNutrition({ ...nutrition, [key]: Number(e.target.value) })} />
  );

  return (
    <li className="stock-row meta-row">
      <span>{dish.name}</span>
      <button type="button" className="btn-dark sm" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit details"}</button>
      {open && (
        <div className="meta-editor">
          <div className="meta-flags">
            {(["jain", "sattvic", "noOnionGarlic"] as const).map((k) => (
              <label key={k} className="meta-flag">
                <input type="checkbox" checked={dietary[k]} onChange={(e) => setDietary({ ...dietary, [k]: e.target.checked })} />
                {k === "jain" ? "Jain" : k === "sattvic" ? "Sattvic" : "No onion-garlic"}
              </label>
            ))}
          </div>
          <div className="meta-nums">
            <label>kcal {num("kcal")}</label>
            <label>Protein g {num("proteinG")}</label>
            <label>Carbs g {num("carbsG")}</label>
            <label>Fat g {num("fatG")}</label>
          </div>
          <label className="meta-allergens">Allergens (comma separated)
            <input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="gluten, milk" />
          </label>
          <button type="button" className="btn-primary sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
        </div>
      )}
    </li>
  );
}

export default function KitchenScreen() {
  const { profile } = useProfile();
  const showToast = useStore((s) => s.showToast);
  const openTrack = useStore((s) => s.openTrack);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [stock, setStock] = useState<Record<string, boolean>>({});
  const [metaRows, setMetaRows] = useState<Record<string, MenuStateRow>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [q, d, ms] = await Promise.all([api.queue(), api.listDrivers(), api.menuState()]);
      setOrders(q);
      setDrivers(d);
      const map: Record<string, boolean> = {};
      const metaMap: Record<string, MenuStateRow> = {};
      ms.forEach((r) => { map[r.name] = r.available; metaMap[r.name] = r; });
      setStock(map);
      setMetaRows(metaMap);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the queue"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (o: Order) => {
    try { await api.advance(o.orderId); load(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Could not update the order"); }
  };

  const toggleStock = async (name: string) => {
    const next = !(stock[name] ?? true);
    setStock((m) => ({ ...m, [name]: next }));
    try { await api.setMenuState(name, next); showToast(next ? `${name} is back in stock` : `${name} marked out of stock`); }
    catch { setStock((m) => ({ ...m, [name]: !next })); showToast("Could not update stock"); }
  };

  const driverName = (sub: string) => drivers.find((d) => d.sub === sub)?.name || "—";

  return (
    <DashShell title="Kitchen" subtitle="Work the queue top to bottom. When an order is packed, a driver takes it from here." profile={profile}>
      {error && <p className="form-err" role="alert">{error}</p>}
      <section className="panel-card">
        <h3 className="panel-h">Live queue ({orders.length})</h3>
        {orders.length === 0 && <p className="dash-note">No active orders. New orders will appear here.</p>}
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.orderId} className="order-row">
              <div className="or-main">
                <p className="or-id">{o.orderId} <StatusPill status={o.status} /></p>
                <p className="or-items">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
                <p className="or-meta">{o.customer.name} · {inr(o.amounts.total)} · {o.paymentMethod}{o.driverSub ? ` · Driver: ${driverName(o.driverSub)}` : ""}</p>
                <p className="or-meta">{o.address}</p>
              </div>
              <div className="or-actions">
                {["received", "preparing"].includes(o.status) && (
                  <button type="button" className="btn-primary sm" onClick={() => advance(o)}>{NEXT_LABEL[o.status]}</button>
                )}
                {o.status === "packing" && <span className="dash-note">{o.driverSub ? `Driver: ${driverName(o.driverSub)}` : "Waiting for a driver"}</span>}
                {o.status === "on_the_way" && (
                  <button type="button" className="btn-dark sm" onClick={() => openTrack(o.orderId)}>Track</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">Menu availability</h3>
        <p className="dash-note">Turn a dish off and it shows "Out of stock" on the menu right away.</p>
        <ul className="stock-list">
          {DISHES.map((d) => {
            const avail = stock[d.name] ?? true;
            return (
              <li key={d.name} className="stock-row">
                <span>{d.name} <span className="or-meta">{inr(d.price)}</span></span>
                <button type="button" role="switch" aria-checked={avail} aria-label={`${d.name} availability`}
                  className={`switch${avail ? " on" : ""}`} onClick={() => toggleStock(d.name)}>
                  <span className="knob" />
                </button>
                <span className={avail ? "stock-on" : "stock-off"}>{avail ? "In stock" : "Out of stock"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">Dish details — dietary &amp; nutrition</h3>
        <p className="dash-note">These are the values customers see on the menu (kitchen-declared estimates). Jain also excludes root vegetables — it is not the same as no onion-garlic.</p>
        <ul className="stock-list">
          {DISHES.map((d) => <DishMetaEditor key={d.name} dish={d} row={metaRows[d.name]} />)}
        </ul>
      </section>

      <section className="panel-card">
        <h3 className="panel-h">Drivers</h3>
        <ul className="driver-list">
          {drivers.map((d) => (
            <li key={d.sub} className="driver-row">
              {d.driver?.photoUrl
                ? <img className="acc-avatar" src={d.driver.photoUrl} alt="" />
                : <span className="acc-initial">{d.name.charAt(0)}</span>}
              <div>
                <p className="acc-name">{d.name}</p>
                <p className="acc-mail">{d.driver?.vehicle || "—"} · ★ {d.driver?.ratingAvg ?? 5} ({d.driver?.ratingCount ?? 0})</p>
              </div>
              <span className={`pill ${d.driver?.available ? "pill-delivered" : "pill-cancelled"}`}>{d.driver?.available ? "On duty" : "Off duty"}</span>
            </li>
          ))}
          {drivers.length === 0 && <li className="dash-note">No drivers yet.</li>}
        </ul>
      </section>
    </DashShell>
  );
}
