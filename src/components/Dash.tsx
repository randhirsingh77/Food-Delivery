import type { ReactNode } from "react";
import { DEMO_MODE } from "../api/client";
import type { OrderStatus, Profile } from "../api/types";
import { useStore } from "../store/useStore";

// Shared building blocks for the platform views (profile, admin, kitchen,
// driver, tracking): the shell with role tabs, status pills and star rows.

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  packing: "Packing",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Stars({ value, size = 5 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars-static" aria-label={`Rated ${value} out of 5`}>
      {Array.from({ length: size }, (_, i) => (
        <i key={i} className={`fa-solid fa-star${i < full ? "" : " dim"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export function RateInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="rate-input" role="radiogroup" aria-label="Rate the driver">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={value === n}
          className={n <= value ? "on" : ""} onClick={() => onChange(n)}>
          <i className="fa-solid fa-star" aria-hidden="true" />
        </button>
      ))}
    </span>
  );
}

const TABS: { view: string; label: string; icon: string; roles: string[] }[] = [
  { view: "profile", label: "Profile & Orders", icon: "fa-user", roles: ["customer", "admin", "manager", "driver"] },
  { view: "admin", label: "Owner Dashboard", icon: "fa-chart-line", roles: ["admin"] },
  { view: "kitchen", label: "Kitchen", icon: "fa-fire-burner", roles: ["manager", "admin"] },
  { view: "driver", label: "Driver", icon: "fa-motorcycle", roles: ["driver"] },
];

export default function DashShell({ title, subtitle, profile, children }: {
  title: string; subtitle?: string; profile: Profile | null; children: ReactNode;
}) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const role = profile?.role || "customer";

  return (
    <main className="dash-wrap">
      <div className="dash-top">
        <button type="button" className="btn-dark dash-back" onClick={() => setView("shop")}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to shop
        </button>
        {DEMO_MODE && <span className="demo-badge" title="No backend connected — showing the built-in demo dataset">Demo data</span>}
      </div>
      <h1 className="dash-title">{title}</h1>
      {subtitle && <p className="dash-sub">{subtitle}</p>}
      <nav className="view-tabs" aria-label="Platform views">
        {TABS.filter((t) => t.roles.includes(role)).map((t) => (
          <button key={t.view} type="button"
            className={`view-tab${view === t.view ? " active" : ""}`}
            onClick={() => setView(t.view as never)}>
            <i className={`fa-solid ${t.icon}`} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </nav>
      {children}
    </main>
  );
}
