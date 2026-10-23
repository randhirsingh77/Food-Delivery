import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { useProfile } from "../api/useProfile";
import type { Analytics } from "../api/types";
import { inr } from "../utils/pricing";
import DashShell, { STATUS_LABEL } from "../components/Dash";

// Owner dashboard: money and orders at a glance — totals, a 14-day sales
// graph, best-selling dishes and the live status mix.
export default function AdminScreen() {
  const { profile } = useProfile();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.analytics().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Could not load analytics"));
  }, []);

  const daily = (data?.daily || []).map((d) => ({ ...d, label: d.date.slice(5).split("-").reverse().join("/") }));

  return (
    <DashShell title="Owner dashboard" subtitle="Sales, orders and what's selling — across the last 14 days." profile={profile}>
      {error && <p className="form-err" role="alert">{error}</p>}
      {!data && !error && <p className="dash-note">Loading…</p>}
      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><p className="stat-label">Total revenue</p><p className="stat-value">{inr(data.totals.revenue)}</p></div>
            <div className="stat-card"><p className="stat-label">Orders</p><p className="stat-value">{data.totals.orders}</p></div>
            <div className="stat-card"><p className="stat-label">Avg. order value</p><p className="stat-value">{inr(data.totals.avgOrderValue)}</p></div>
            <div className="stat-card"><p className="stat-label">Delivered</p><p className="stat-value">{data.totals.delivered}</p></div>
            <div className="stat-card"><p className="stat-label">Drivers on duty</p><p className="stat-value">{data.totals.activeDrivers}</p></div>
          </div>

          <section className="panel-card">
            <h3 className="panel-h">Sales — last 14 days</h3>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5a301" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f5a301" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b5d4a" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b5d4a" }} tickFormatter={(v: number) => `₹${v}`} width={64} />
                  <Tooltip formatter={(v, name) => [name === "revenue" ? inr(Number(v ?? 0)) : Number(v ?? 0), name === "revenue" ? "Revenue" : "Orders"] as [string | number, string]} />
                  <Area type="monotone" dataKey="revenue" stroke="#d98e00" strokeWidth={2} fill="url(#revFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="dash-grid">
            <section className="panel-card">
              <h3 className="panel-h">Top dishes</h3>
              <table className="tbl">
                <thead><tr><th>Dish</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.topDishes.map((d) => (
                    <tr key={d.name}><td>{d.name}</td><td>{d.qty}</td><td>{inr(d.revenue)}</td></tr>
                  ))}
                  {data.topDishes.length === 0 && <tr><td colSpan={3}>No sales yet.</td></tr>}
                </tbody>
              </table>
            </section>
            <section className="panel-card">
              <h3 className="panel-h">Orders by status</h3>
              <ul className="status-counts">
                {Object.entries(data.statusCounts).map(([st, n]) => (
                  <li key={st}><span className={`pill pill-${st}`}>{STATUS_LABEL[st as keyof typeof STATUS_LABEL]}</span><strong>{n}</strong></li>
                ))}
                {Object.keys(data.statusCounts).length === 0 && <li>No orders yet.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </DashShell>
  );
}
