import { DEMO_SESSION_KEY, demoApi, setDemoIdentity } from "./demo";
import type { Address, DriverSummary, FoodieApi, Profile } from "./types";

// API selection: when VITE_API_URL points at the foodie-server backend, all
// calls go over HTTP with our own JWT ("Authorization: Bearer ...");
// otherwise the built-in demo dataset answers. The UI uses the same
// FoodieApi interface either way.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const DEMO_MODE = !API_URL;
export const GOOGLE_URL = API_URL ? `${API_URL}/api/v1/auth/google` : "";

const TOKEN_KEY = "foodie-token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
export const saveToken = (t: string) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

// Legacy hook kept for the store's first-load adoption code paths.
export function setIdentity(id: { sub: string; email?: string; name?: string; picture?: string } | null) {
  setDemoIdentity(id);
}

export function logout() {
  saveToken("");
  try { localStorage.removeItem(DEMO_SESSION_KEY); } catch { /* ignore */ }
  setDemoIdentity(null);
}

// On app start: bring back the signed-in profile (JWT in HTTP mode, the
// demo session otherwise). Returns null when signed out.
export async function restoreSession(): Promise<Profile | null> {
  try {
    if (DEMO_MODE) {
      const sub = localStorage.getItem(DEMO_SESSION_KEY);
      if (!sub) return null;
      setDemoIdentity({ sub });
      const p = await demoApi.getProfile();
      setDemoIdentity({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
      return p;
    }
    if (!getToken()) return null;
    return await httpApi.getProfile();
  } catch {
    return null;
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return (json as { data: T }).data;
}

const httpApi: FoodieApi = {
  register: (input) => req("POST", "/api/v1/auth/register", input),
  login: (id, password) => req("POST", "/api/v1/auth/login", { id, password }),
  demoLogin: (role) => req("POST", "/api/v1/auth/demo-login", { role }),
  googleDemo: async () => { throw new Error("Google sign-in runs through the backend"); },
  forgot: async (email) => { await req("POST", "/api/v1/auth/forgot", { email }); },
  changePassword: async (currentPassword, newPassword) => { await req("POST", "/api/v1/auth/change-password", { currentPassword, newPassword }); },
  getProfile: () => req("GET", "/api/v1/profile"),
  updateProfile: (patch) => req("PUT", "/api/v1/profile", patch),
  addAddress: (a: Address) => req("POST", "/api/v1/profile/addresses", a),
  deleteAddress: (id: string) => req("DELETE", `/api/v1/profile/addresses/${id}`),
  listDrivers: () => req<DriverSummary[]>("GET", "/api/v1/profile/by-role?role=driver"),
  createOrder: (payload) => req("POST", "/api/v1/orders", payload),
  myOrders: () => req("GET", "/api/v1/orders/mine"),
  queue: () => req("GET", "/api/v1/orders/queue"),
  accept: (orderId) => req("POST", `/api/v1/orders/${orderId}/accept`),
  advance: (orderId) => req("POST", `/api/v1/orders/${orderId}/advance`),
  rate: (orderId, stars, comment) => req("POST", `/api/v1/orders/${orderId}/rate`, { stars, comment }),
  track: (orderId) => req("GET", `/api/v1/orders/${orderId}/track`),
  analytics: () => req("GET", "/api/v1/admin/analytics"),
  menuState: () => req("GET", "/api/v1/menu-state"),
  setMenuState: async (name, available) => { await req("PATCH", `/api/v1/menu-state/${encodeURIComponent(name)}`, { available }); },
  setDishMeta: async (name, meta) => { await req("PATCH", `/api/v1/menu-state/${encodeURIComponent(name)}`, meta); },
  createGroupCart: (hostUpiId) => req("POST", "/api/v1/group-carts", { hostUpiId }),
  myGroupCarts: () => req("GET", "/api/v1/group-carts/mine"),
  getGroupCart: (code) => req("GET", `/api/v1/group-carts/${encodeURIComponent(code)}`),
  joinGroupCart: (code) => req("POST", `/api/v1/group-carts/${encodeURIComponent(code)}/join`, {}),
  addGroupItem: (code, name, qty) => req("POST", `/api/v1/group-carts/${encodeURIComponent(code)}/items`, { name, qty }),
  removeGroupItem: (code, itemId) => req("DELETE", `/api/v1/group-carts/${encodeURIComponent(code)}/items/${itemId}`),
  lockGroupCart: (code) => req("POST", `/api/v1/group-carts/${encodeURIComponent(code)}/lock`, {}),
  checkoutGroupCart: (code, input) => req("POST", `/api/v1/group-carts/${encodeURIComponent(code)}/checkout`, input),
  tiffinPlans: () => req("GET", "/api/v1/subscriptions/plans"),
  subscribe: (planId, input) => req("POST", "/api/v1/subscriptions", { planId, ...input }),
  mySubscriptions: () => req("GET", "/api/v1/subscriptions/mine"),
  skipTiffinDay: (id, date) => req("POST", `/api/v1/subscriptions/${id}/skip`, { date }),
  pauseTiffin: (id, days) => req("POST", `/api/v1/subscriptions/${id}/pause`, { days }),
  resumeTiffin: (id) => req("POST", `/api/v1/subscriptions/${id}/resume`, {}),
};

export const api: FoodieApi = DEMO_MODE ? demoApi : httpApi;
export type { Profile };
