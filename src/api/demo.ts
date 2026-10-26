import { DISHES, dishByName, isHighProteinNutrition } from "../data/dishes";
import { breakdown } from "../utils/pricing";
import type {
  Address, Analytics, DishMetaData, DriverSummary, FoodieApi, GroupCart, GroupSplit, MenuStateRow, NewOrderPayload, Order, OrderStatus,
  Profile, Role, Subscription, TiffinPlan, TrackData,
} from "./types";

// ---------------------------------------------------------------------------
// Demo dataset + in-browser implementation of the platform API.
// Used when VITE_API_URL is not set: the whole platform (dashboards,
// kitchen, drivers, tracking) works with realistic seeded data, stored in
// localStorage. When the real backend is connected, client.ts swaps this
// out for HTTP calls — the UI cannot tell the difference.
// ---------------------------------------------------------------------------

export const RESTAURANT = { lat: 28.6315, lng: 77.2167, name: "Foodie · Connaught Place" };
const DEMO_RIDE_MINUTES = 3; // shortened so the rider visibly moves in a demo
const DRIVER_PAY = 40;
const DB_KEY = "foodie-demo-db-v1";

let identity = { sub: "demo-guest", email: "", name: "Guest", picture: "" };
export function setDemoIdentity(id: { sub: string; email?: string; name?: string; picture?: string } | null) {
  identity = id
    ? { sub: id.sub, email: id.email || "", name: id.name || "", picture: id.picture || "" }
    : { sub: "demo-guest", email: "", name: "Guest", picture: "" };
}
export const demoIdentity = () => identity;

function pointForOrder(orderId: string) {
  let h = 0;
  for (const ch of orderId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    lat: RESTAURANT.lat + (((h % 700) - 350) / 10000) * 1.6,
    lng: RESTAURANT.lng + ((((h >> 9) % 700) - 350) / 10000) * 1.6,
  };
}

const blankDriver = () => ({ vehicle: "", photoUrl: "", available: true, ratingAvg: 5, ratingCount: 0, earnings: 0, deliveries: 0 });

function mkProfile(p: Partial<Profile> & { sub: string }): Profile {
  return {
    email: "", name: "", phone: "", picture: "", role: "customer", addresses: [],
    ...p, driver: { ...blankDriver(), ...(p.driver || {}) },
  };
}

interface DemoDb {
  profiles: Record<string, Profile>; orders: Order[]; dishState: Record<string, boolean>;
  accounts: Record<string, { sub: string; pass: string }>;
  dishMeta: Record<string, DishMetaData>;
  groupCarts: GroupCart[];
  joinAttempts: Record<string, { start: number; count: number }>;
  subscriptions: Subscription[];
}

function seedOrder(i: number, daysAgo: number, status: OrderStatus, userSub: string, driverSub = ""): Order {
  const picks = [DISHES[i % DISHES.length], DISHES[(i + 4) % DISHES.length]];
  const items = picks.map((d, k) => ({ name: d.name, qty: 1 + ((i + k) % 3), price: d.price }));
  const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0);
  const promo = subtotal >= 299;
  const b = breakdown(subtotal, promo);
  const created = new Date(Date.now() - daysAgo * 86400000 - (i % 5) * 3600000);
  const timeline: Order["timeline"] = [{ status: "received", at: created.toISOString() }];
  const flow: OrderStatus[] = ["preparing", "packing", "on_the_way", "delivered"];
  const upto = flow.indexOf(status);
  flow.slice(0, upto + (status === "received" ? -1 : 0)).forEach((st, k) => {
    if (st !== status || status === "delivered") timeline.push({ status: st, at: new Date(created.getTime() + (k + 1) * 600000).toISOString() });
  });
  if (status === "on_the_way") {
    timeline.push({ status: "on_the_way", at: new Date(Date.now() - 45000).toISOString() }); // rider left 45s ago
  }
  const orderId = `FD-SEED${i + 1}`;
  return {
    orderId,
    customer: { name: ["Aarav", "Priya", "Karan", "Sneha"][i % 4], email: `customer${i}@example.com`, phone: "9810000000" },
    items, amounts: b, promoCode: promo ? "FOODIE50" : "",
    address: `${10 + i} Seed Street, New Delhi`, paymentMethod: i % 2 ? "UPI" : "Cash on Delivery",
    status, userSub, driverSub,
    deliveryPoint: pointForOrder(orderId),
    timeline, rating: null,
    createdAt: created.toISOString(),
  };
}

function seed(): DemoDb {
  const profiles: Record<string, Profile> = {};
  const drivers: [string, string, string, number, number, number, number, number][] = [
    ["seed-driver-1", "Arjun Mehta", "Honda Activa · DL 8C 4521", 12, 4.8, 132, 12400, 310],
    ["seed-driver-2", "Ravi Kumar", "TVS Ntorq · DL 5S 9034", 32, 4.6, 98, 8650, 216],
    ["seed-driver-3", "Imran Sheikh", "Bajaj Pulsar · DL 7C 2210", 53, 4.9, 210, 15230, 381],
  ];
  drivers.forEach(([sub, name, vehicle, img, avg, count, earn, del]) => {
    profiles[sub] = mkProfile({
      sub, name, email: `${sub}@foodie.example`, role: "driver",
      driver: { vehicle, photoUrl: `https://i.pravatar.cc/100?img=${img}`, available: sub !== "seed-driver-3", ratingAvg: avg, ratingCount: count, earnings: earn, deliveries: del },
    });
  });
  profiles["seed-manager"] = mkProfile({ sub: "seed-manager", name: "Kitchen Manager", email: "manager@foodie.example", role: "manager" });

  // Login-able demo accounts for one-click demo access (mirrors the
  // backend's seeded demo accounts; the demo flag travels on the profile).
  profiles["demo-customer"] = mkProfile({
    sub: "demo-customer", name: "Demo Customer", email: "demo.customer@foodie.example", phone: "9810000011", role: "customer",
    addresses: [{ _id: "addr-demo", label: "Home", line: "B-42, Connaught Place", city: "New Delhi", pincode: "110001", lat: 28.6358, lng: 77.2245 }],
  });
  profiles["demo-manager"] = mkProfile({ sub: "demo-manager", name: "Demo Manager", email: "demo.manager@foodie.example", phone: "9810000012", role: "manager" });
  profiles["demo-driver"] = mkProfile({
    sub: "demo-driver", name: "Demo Driver", email: "demo.driver@foodie.example", phone: "9810000013", role: "driver",
    driver: { vehicle: "Honda Activa · DL 8C 1001", photoUrl: "", available: true, ratingAvg: 4.9, ratingCount: 47, earnings: 3200, deliveries: 80 },
  });
  for (const sub of ["demo-customer", "demo-manager", "demo-driver"]) {
    (profiles[sub] as Profile & { demo?: boolean }).demo = true;
  }

  const plan: [number, OrderStatus][] = [
    [0, "delivered"], [0, "delivered"], [1, "delivered"], [2, "delivered"], [3, "packing"],
    [4, "delivered"], [5, "preparing"], [6, "delivered"], [7, "received"], [8, "delivered"],
    [9, "delivered"], [10, "delivered"], [11, "delivered"], [12, "delivered"], [13, "delivered"],
  ];
  const orders = plan.map(([d, st], i) => seedOrder(i, d, st, "seed-customer", ["packing", "delivered"].includes(st) ? `seed-driver-${(i % 3) + 1}` : ""));
  // Showcase orders for the signed-out/guest profile: one out for delivery now.
  orders.push(seedOrder(21, 0, "on_the_way", "demo-guest", "seed-driver-1"));
  orders.push(seedOrder(22, 0, "delivered", "demo-guest", "seed-driver-2"));
  orders.push(seedOrder(23, 0, "preparing", "demo-guest"));
  // Showcase orders owned by the demo-customer account.
  orders.push(seedOrder(31, 0, "preparing", "demo-customer"));
  orders.push(seedOrder(32, 1, "delivered", "demo-customer", "demo-driver"));
  return { profiles, orders, dishState: {}, accounts: {}, dishMeta: {}, groupCarts: [], joinAttempts: {}, subscriptions: [] };
}

// Demo-only password marker (NOT real security — the demo dataset lives in
// the visitor's own browser; the real backend uses bcrypt + JWT).
const demoHash = (s: string) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return "d" + h.toString(36); };
export const DEMO_SESSION_KEY = "foodie-demo-session";

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as DemoDb;
      db.dishMeta = db.dishMeta || {};
      db.groupCarts = db.groupCarts || [];
      db.joinAttempts = db.joinAttempts || {};
      db.subscriptions = db.subscriptions || [];
      return db;
    }
  } catch { /* reseed */ }
  const db = seed();
  save(db);
  return db;
}
function save(db: DemoDb) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

function myProfile(db: DemoDb): Profile {
  if (!db.profiles[identity.sub]) {
    db.profiles[identity.sub] = mkProfile({ sub: identity.sub, email: identity.email, name: identity.name, picture: identity.picture });
    save(db);
  }
  return db.profiles[identity.sub];
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// --- Group cart helpers (mirror of the backend's splits util) ------------
function allocatePaise(totalPaise: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (totalWeight <= 0) {
    const base = Math.floor(totalPaise / n);
    const shares = weights.map(() => base);
    for (let i = 0; i < totalPaise - base * n; i++) shares[i] += 1;
    return shares;
  }
  const exact = weights.map((w) => (totalPaise * Math.max(0, w)) / totalWeight);
  const shares = exact.map((x) => Math.floor(x));
  let leftover = totalPaise - shares.reduce((s, x) => s + x, 0);
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (let k = 0; leftover > 0; k++, leftover--) shares[byRemainder[k % n].i] += 1;
  return shares;
}

function groupSplits(cart: GroupCart, promo: boolean): GroupSplit[] {
  if (!cart.items.length) return [];
  const subtotal = cart.items.reduce((s, i) => s + i.priceSnapshot * i.qty, 0);
  const b = breakdown(subtotal, promo);
  const sharedPaise = (b.delivery - b.discount) * 100;
  const people = new Map<string, { sub: string; name: string; itemsPaise: number }>();
  for (const it of cart.items) {
    const p = people.get(it.addedBySub) || { sub: it.addedBySub, name: it.addedByName || "", itemsPaise: 0 };
    p.itemsPaise += it.priceSnapshot * 100 * it.qty;
    people.set(it.addedBySub, p);
  }
  const list = [...people.values()];
  const shares = allocatePaise(sharedPaise, list.map((p) => p.itemsPaise));
  const splits = list.map((p, i) => ({ sub: p.sub, name: p.name, amountPaise: p.itemsPaise + shares[i] }));
  const sum = splits.reduce((s, x) => s + x.amountPaise, 0);
  if (splits.length && sum !== b.total * 100) splits[0].amountPaise += b.total * 100 - sum;
  return splits;
}

function groupView(cart: GroupCart, promo = false): GroupCart {
  return { ...cart, splits: groupSplits(cart, promo) };
}

// --- Tiffin helpers (mirror of the backend's ist util + plans) -----------
const TIFFIN_PLANS: TiffinPlan[] = [
  { id: "weekly", name: "Weekly Tiffin", meals: 6, price: 699, periodDays: 7, blurb: "6 thali meals over 7 days — one day off built in." },
  { id: "monthly", name: "Monthly Tiffin", meals: 24, price: 2499, periodDays: 28, blurb: "24 thali meals over 4 weeks — the PG and hostel favourite." },
];
const TIFFIN_POLICY =
  "Skip or pause before 9:00 PM for the next day. Skipped and paused days extend your plan. Unused meals expire at the end of the plan and are not refunded. Plans never auto-renew.";

const istKey = (d = new Date()) => new Date(d.getTime() + (5 * 60 + 30) * 60000).toISOString().slice(0, 10);
function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function beforeCutoffFor(targetKey: string) {
  const today = istKey();
  if (targetKey <= today) return false;
  const diff = Math.round((Date.parse(`${targetKey}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (diff >= 2) return true;
  const now = new Date(Date.now() + (5 * 60 + 30) * 60000);
  return now.getUTCHours() * 60 + now.getUTCMinutes() < 21 * 60;
}

function subView(sub: Subscription): Subscription {
  const today = istKey();
  return {
    ...sub,
    mealsLeft: Math.max(0, sub.mealsTotal - sub.mealsUsed),
    todayStatus:
      sub.status === "paused" && (sub.pausedUntil || "") >= today
        ? "paused"
        : sub.skippedDates.includes(today)
          ? "skipped"
          : sub.ledger.some((l) => l.type === "materialise" && l.date === today)
            ? "delivered"
            : sub.status,
  };
}

// Demo stand-in for the backend's externally triggered daily job: when
// the subscriber's plans are loaded, today's thali is materialised once.
function materialiseToday(db: DemoDb, sub: Subscription) {
  const today = istKey();
  if (sub.status !== "active" && !(sub.status === "paused")) return;
  if (today < sub.startDate || today > sub.endDate) return;
  const pausedDay = sub.status === "paused" && (sub.pausedFrom || "") <= today && today <= (sub.pausedUntil || "");
  if (pausedDay || sub.skippedDates.includes(today)) return;
  if (sub.ledger.some((l) => l.type === "materialise" && l.date === today)) return;
  if (sub.mealsUsed >= sub.mealsTotal) return;
  const thali = dishByName("Ghar Jaisa Thali");
  if (!thali) return;
  const order: Order = {
    orderId: `FD-TF-${sub._id.slice(-6).toUpperCase()}-${today.replace(/-/g, "")}`,
    customer: { name: sub.userSub === identity.sub ? (identity.name || "Tiffin subscriber") : "Tiffin subscriber", email: identity.email || "subscriber@foodie.example", phone: "9810000000" },
    items: [{ name: thali.name, qty: 1, price: thali.price }],
    amounts: breakdown(thali.price, false),
    address: sub.address, note: `Tiffin subscription (${sub.planName})`, paymentMethod: sub.paymentMethod,
    status: "received", userSub: sub.userSub, driverSub: "",
    deliveryPoint: pointForOrder("tf" + sub._id),
    timeline: [{ status: "received", at: new Date().toISOString() }],
    rating: null, subscriptionId: sub._id,
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  sub.mealsUsed += 1;
  sub.ledger.push({ date: today, type: "materialise", mealsDelta: -1, orderId: order.orderId, at: new Date().toISOString() });
  if (sub.mealsUsed >= sub.mealsTotal) sub.status = "exhausted";
}

function findGroupCart(db: DemoDb, code: string): GroupCart {
  const cart = db.groupCarts.find((c) => c.code === code.toUpperCase());
  if (!cart) throw new Error("That group cart has expired or does not exist.");
  if (cart.status === "open" && new Date(cart.expiresAt).getTime() < Date.now()) cart.status = "expired";
  return cart;
}

export const demoApi: FoodieApi = {
  async register(input) {
    const db = load();
    const emailKey = input.email.toLowerCase();
    if (db.accounts[emailKey] || db.accounts[input.phone]) throw new Error("An account with this email or phone already exists. Try logging in.");
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
    const sub = "local-" + Math.random().toString(36).slice(2, 10);
    db.profiles[sub] = mkProfile({ sub, name: input.name, email: emailKey, phone: input.phone });
    db.accounts[emailKey] = { sub, pass: demoHash(input.password) };
    db.accounts[input.phone] = { sub, pass: demoHash(input.password) };
    save(db);
    setDemoIdentity({ sub, email: emailKey, name: input.name });
    try { localStorage.setItem(DEMO_SESSION_KEY, sub); } catch { /* ignore */ }
    return { token: "demo-" + sub, profile: clone(db.profiles[sub]) };
  },

  async login(id, password) {
    const db = load();
    const acct = db.accounts[id.toLowerCase()] || db.accounts[id];
    if (!acct || acct.pass !== demoHash(password)) throw new Error("Wrong email/phone or password.");
    const p = db.profiles[acct.sub];
    setDemoIdentity({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
    try { localStorage.setItem(DEMO_SESSION_KEY, p.sub); } catch { /* ignore */ }
    return { token: "demo-" + p.sub, profile: clone(p) };
  },

  async demoLogin(role: Role) {
    const db = load();
    const sub = `demo-${role}`;
    const p = db.profiles[sub];
    if (!p) throw new Error("Demo accounts are not set up yet.");
    setDemoIdentity({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
    try { localStorage.setItem(DEMO_SESSION_KEY, p.sub); } catch { /* ignore */ }
    return { token: "demo-" + p.sub, profile: clone(p) };
  },

  async googleDemo() {
    const db = load();
    const sub = "google-demo-user";
    if (!db.profiles[sub]) {
      db.profiles[sub] = mkProfile({ sub, name: "Google Demo User", email: "google.demo@foodie.example", picture: "https://i.pravatar.cc/100?img=5" });
      save(db);
    }
    const p = db.profiles[sub];
    setDemoIdentity({ sub, email: p.email, name: p.name, picture: p.picture });
    try { localStorage.setItem(DEMO_SESSION_KEY, sub); } catch { /* ignore */ }
    return clone(p);
  },

  async forgot() { /* demo: nothing to send */ },

  async changePassword(currentPassword: string, newPassword: string) {
    const db = load(); const p = myProfile(db);
    const acct = Object.values(db.accounts).find((a) => a.sub === p.sub);
    if (!acct) throw new Error("This account signs in with Google — manage the password in your Google account.");
    if (acct.pass !== demoHash(currentPassword)) throw new Error("Current password is wrong.");
    if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
    for (const k of Object.keys(db.accounts)) if (db.accounts[k].sub === p.sub) db.accounts[k].pass = demoHash(newPassword);
    save(db);
  },

  async getProfile() { return clone(myProfile(load())); },

  async updateProfile(patch) {
    const db = load(); const p = myProfile(db);
    if (typeof patch.name === "string") p.name = patch.name;
    if (typeof patch.phone === "string") p.phone = patch.phone;
    if (typeof patch.picture === "string") p.picture = patch.picture;
    if (patch.driver) Object.assign(p.driver, patch.driver);
    save(db); return clone(p);
  },

  async addAddress(a: Address) {
    const db = load(); const p = myProfile(db);
    p.addresses.push({ ...a, _id: "addr-" + Math.random().toString(36).slice(2, 9) });
    save(db); return clone(p);
  },

  async deleteAddress(id: string) {
    const db = load(); const p = myProfile(db);
    p.addresses = p.addresses.filter((x) => x._id !== id);
    save(db); return clone(p);
  },

  async listDrivers() {
    const db = load();
    return Object.values(db.profiles).filter((p) => p.role === "driver")
      .map((p) => ({ sub: p.sub, name: p.name, picture: p.picture, role: p.role, driver: clone(p.driver) }));
  },

  async createOrder(payload: NewOrderPayload) {
    const db = load();
    const existing = db.orders.find((o) => o.orderId === payload.orderId);
    if (existing) return clone(existing);
    const items = payload.items.map((it) => {
      const d = dishByName(it.name);
      if (!d) throw new Error(`Unknown dish: ${it.name}`);
      return { name: d.name, qty: it.qty, price: d.price };
    });
    const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0);
    const order: Order = {
      orderId: payload.orderId,
      customer: payload.customer, items,
      amounts: breakdown(subtotal, (payload.promoCode || "").toUpperCase() === "FOODIE50"),
      promoCode: (payload.promoCode || "").toUpperCase(),
      address: payload.address, note: payload.note, paymentMethod: payload.paymentMethod,
      status: "received", userSub: identity.sub, driverSub: "",
      deliveryPoint: payload.deliveryPoint || pointForOrder(payload.orderId),
      timeline: [{ status: "received", at: new Date().toISOString() }],
      rating: null, createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order); save(db); return clone(order);
  },

  async myOrders() {
    const db = load();
    return clone(db.orders.filter((o) => o.userSub === identity.sub));
  },

  async queue() {
    const db = load(); const me = myProfile(db);
    if (me.role === "driver") {
      return clone(db.orders.filter((o) =>
        (o.status === "packing" && !o.driverSub) || (o.driverSub === me.sub && ["packing", "on_the_way"].includes(o.status))));
    }
    return clone(db.orders.filter((o) => ["received", "preparing", "packing", "on_the_way"].includes(o.status)));
  },

  async accept(orderId: string) {
    const db = load(); const me = myProfile(db);
    const o = db.orders.find((x) => x.orderId === orderId);
    if (!o) throw new Error("Order not found");
    if (o.driverSub && o.driverSub !== me.sub) throw new Error("Another driver took this order");
    if (o.status !== "packing") throw new Error("Order is not ready for pickup yet");
    o.driverSub = me.sub; save(db); return clone(o);
  },

  async advance(orderId: string) {
    const db = load(); const me = myProfile(db);
    const o = db.orders.find((x) => x.orderId === orderId);
    if (!o) throw new Error("Order not found");
    const next: Partial<Record<OrderStatus, OrderStatus>> = { received: "preparing", preparing: "packing", packing: "on_the_way", on_the_way: "delivered" };
    const nx = next[o.status];
    if (!nx) throw new Error("This order is finished");
    const kitchenStep = ["received", "preparing"].includes(o.status);
    if (kitchenStep && !["manager", "admin"].includes(me.role)) throw new Error("Only the kitchen can do this step");
    if (!kitchenStep && !(me.role === "admin" || (me.role === "driver" && o.driverSub === me.sub))) throw new Error("Only the assigned driver can do this step");
    o.status = nx;
    o.timeline.push({ status: nx, at: new Date().toISOString() });
    if (nx === "delivered" && o.driverSub && db.profiles[o.driverSub]) {
      db.profiles[o.driverSub].driver.earnings += DRIVER_PAY;
      db.profiles[o.driverSub].driver.deliveries += 1;
    }
    save(db); return clone(o);
  },

  async rate(orderId: string, stars: number, comment?: string) {
    const db = load();
    const o = db.orders.find((x) => x.orderId === orderId);
    if (!o) throw new Error("Order not found");
    o.rating = { stars, comment, ratedAt: new Date().toISOString() };
    const d = o.driverSub ? db.profiles[o.driverSub] : undefined;
    if (d) {
      const c = d.driver.ratingCount + 1;
      d.driver.ratingAvg = Math.round(((d.driver.ratingAvg * d.driver.ratingCount + stars) / c) * 10) / 10;
      d.driver.ratingCount = c;
    }
    save(db); return clone(o);
  },

  async track(orderId: string) {
    const db = load();
    const o = db.orders.find((x) => x.orderId === orderId);
    if (!o) throw new Error("Order not found");
    const dest = o.deliveryPoint || RESTAURANT;
    let rider = null; let etaMinutes: number | null = null;
    if (o.status === "on_the_way") {
      const started = [...o.timeline].reverse().find((t) => t.status === "on_the_way");
      const startMs = started ? new Date(started.at).getTime() : Date.now();
      const progress = Math.min(1, Math.max(0, (Date.now() - startMs) / (DEMO_RIDE_MINUTES * 60000)));
      rider = { lat: RESTAURANT.lat + (dest.lat - RESTAURANT.lat) * progress, lng: RESTAURANT.lng + (dest.lng - RESTAURANT.lng) * progress };
      etaMinutes = Math.max(1, Math.ceil(DEMO_RIDE_MINUTES * (1 - progress)));
    } else if (o.status === "delivered") { rider = dest; etaMinutes = 0; }
    // Queue-aware estimate, mirroring the backend's eta util with the
    // demo's shortened ride time: orders ahead × average prep + ride.
    let etaLow: number | null = null; let etaHigh: number | null = null;
    let queueAhead: number | null = null; let avgPrepMinutes: number | null = null;
    let etaReason: string | null = null;
    if (["received", "preparing", "packing"].includes(o.status)) {
      queueAhead = db.orders.filter((x) => x.orderId !== o.orderId && ["received", "preparing"].includes(x.status) && x.createdAt < o.createdAt).length;
      avgPrepMinutes = 12; // demo fallback, same as the backend's
      const prepWait = o.status === "packing" ? 3 : (queueAhead + 1) * avgPrepMinutes;
      etaLow = Math.max(2, prepWait + DEMO_RIDE_MINUTES - 2);
      etaHigh = prepWait + DEMO_RIDE_MINUTES + 3;
      etaReason = o.status === "packing"
        ? "Your order is packed and waiting for a rider. Estimated from the live kitchen queue."
        : `${queueAhead} order${queueAhead === 1 ? "" : "s"} ahead of yours · kitchen averaging ~${avgPrepMinutes} min per order right now. Estimated from the live kitchen queue.`;
    }
    const dp = o.driverSub ? db.profiles[o.driverSub] : undefined;
    return {
      orderId: o.orderId, status: o.status, timeline: o.timeline,
      restaurant: RESTAURANT, destination: dest, rider, etaMinutes,
      etaLow, etaHigh, queueAhead, avgPrepMinutes, etaReason,
      driver: dp ? { name: dp.name || "Driver", photoUrl: dp.driver.photoUrl || dp.picture || "", vehicle: dp.driver.vehicle, ratingAvg: dp.driver.ratingAvg, ratingCount: dp.driver.ratingCount } : null,
      rating: o.rating?.stars ? { stars: o.rating.stars } : null,
    } satisfies TrackData;
  },

  async analytics() {
    const db = load();
    const orders = db.orders.filter((o) => o.status !== "cancelled");
    const revenue = orders.reduce((s, o) => s + o.amounts.total, 0);
    const days = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.set(key, { date: key, revenue: 0, orders: 0 });
    }
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    const statusCounts: Analytics["statusCounts"] = {};
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      const key = o.createdAt.slice(0, 10);
      if (days.has(key)) { const d = days.get(key)!; d.revenue += o.amounts.total; d.orders += 1; }
      for (const it of o.items) {
        const cur = dishMap.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty; cur.revenue += it.qty * it.price; dishMap.set(it.name, cur);
      }
    }
    const drivers = Object.values(db.profiles).filter((p) => p.role === "driver");
    return {
      totals: {
        revenue, orders: orders.length,
        avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
        delivered: statusCounts.delivered || 0,
        activeDrivers: drivers.filter((d) => d.driver.available).length,
      },
      daily: [...days.values()],
      topDishes: [...dishMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      statusCounts,
    };
  },

  async menuState(): Promise<MenuStateRow[]> {
    const db = load();
    return DISHES.map((d) => {
      const meta = db.dishMeta[d.name] || { dietary: d.dietary, allergens: d.allergens, nutritionPerServing: d.nutritionPerServing };
      return {
        name: d.name,
        available: db.dishState[d.name] !== false,
        dietary: clone(meta.dietary),
        allergens: [...meta.allergens],
        nutritionPerServing: { ...meta.nutritionPerServing },
        isHighProtein: isHighProteinNutrition(meta.nutritionPerServing),
      };
    });
  },

  async setMenuState(name: string, available: boolean) {
    const db = load();
    db.dishState[name] = available; save(db);
  },

  // --- Group carts (mirror of the backend's groupCartController) --------
  async createGroupCart(hostUpiId?: string) {
    const db = load(); const me = myProfile(db);
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const cart: GroupCart = {
      _id: "gc-" + Math.random().toString(36).slice(2, 10), id: "",
      hostSub: me.sub, hostName: me.name || "", hostUpiId: hostUpiId || "",
      code, status: "open",
      participants: [{ sub: me.sub, name: me.name || "", joinedAt: new Date().toISOString() }],
      items: [], version: 0, orderId: "",
      expiresAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      splits: [], createdAt: new Date().toISOString(),
    };
    cart.id = cart._id;
    db.groupCarts.unshift(cart); save(db);
    return clone(cart);
  },

  async myGroupCarts() {
    const db = load(); const me = myProfile(db);
    return clone(db.groupCarts.filter((c) => c.hostSub === me.sub || c.participants.some((p) => p.sub === me.sub)).map((c) => groupView(c)));
  },

  async getGroupCart(code: string) {
    const db = load(); const me = myProfile(db);
    const cart = findGroupCart(db, code);
    if (!cart.participants.some((p) => p.sub === me.sub) && cart.hostSub !== me.sub) throw new Error("Join this cart first.");
    return clone(groupView(cart));
  },

  async joinGroupCart(code: string) {
    const db = load(); const me = myProfile(db);
    const key = code.toUpperCase();
    const att = db.joinAttempts[key];
    if (!att || Date.now() - att.start > 10 * 60000) db.joinAttempts[key] = { start: Date.now(), count: 0 };
    db.joinAttempts[key].count += 1;
    if (db.joinAttempts[key].count > 10) { save(db); throw new Error("Too many attempts. Please wait a bit and try again."); }
    const cart = findGroupCart(db, code);
    if (cart.status !== "open") { save(db); throw new Error("This cart is no longer open for joining."); }
    if (!cart.participants.some((p) => p.sub === me.sub)) {
      cart.participants.push({ sub: me.sub, name: me.name || "", joinedAt: new Date().toISOString() });
      cart.version += 1;
    }
    save(db);
    return clone(groupView(cart));
  },

  async addGroupItem(code: string, name: string, qty: number) {
    const db = load(); const me = myProfile(db);
    const cart = findGroupCart(db, code);
    if (!cart.participants.some((p) => p.sub === me.sub) && cart.hostSub !== me.sub) throw new Error("Join this cart first.");
    const dish = dishByName(name);
    if (!dish) throw new Error(`Unknown dish: ${name}`);
    if (cart.status !== "open") throw new Error("This cart is no longer open.");
    cart.items.push({ _id: "gi-" + Math.random().toString(36).slice(2, 9), addedBySub: me.sub, addedByName: me.name || "", name, qty, priceSnapshot: dish.price });
    cart.version += 1; save(db);
    return clone(groupView(cart));
  },

  async removeGroupItem(code: string, itemId: string) {
    const db = load(); const me = myProfile(db);
    const cart = findGroupCart(db, code);
    const item = cart.items.find((i) => i._id === itemId);
    if (!item) throw new Error("No such item in this cart.");
    if (cart.hostSub !== me.sub && item.addedBySub !== me.sub) throw new Error("You can only remove your own items.");
    if (cart.status !== "open") throw new Error("This cart is no longer open.");
    cart.items = cart.items.filter((i) => i._id !== itemId);
    cart.version += 1; save(db);
    return clone(groupView(cart));
  },

  async lockGroupCart(code: string) {
    const db = load(); const me = myProfile(db);
    const cart = findGroupCart(db, code);
    if (cart.hostSub !== me.sub) throw new Error("Only the host can lock the cart.");
    if (!cart.items.length) throw new Error("The cart is empty.");
    if (cart.status !== "open") throw new Error("This cart is no longer open.");
    cart.items.forEach((i) => { const d = dishByName(i.name); if (d) i.priceSnapshot = d.price; });
    cart.status = "locked"; cart.version += 1; save(db);
    return clone(groupView(cart));
  },

  async checkoutGroupCart(code: string, input: { address: string; paymentMethod: string; promoCode?: string; name?: string; phone?: string }) {
    const db = load(); const me = myProfile(db);
    const cart = findGroupCart(db, code);
    if (cart.hostSub !== me.sub) throw new Error("Only the host can check out.");
    if (cart.status !== "locked") throw new Error("This cart is not locked and ready to check out.");
    const promo = (input.promoCode || "").toUpperCase() === "FOODIE50";
    const items = cart.items.map((i) => ({ name: i.name, qty: i.qty, price: i.priceSnapshot }));
    const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0);
    const amounts = breakdown(subtotal, promo);
    const order: Order = {
      orderId: "FD-G" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      customer: { name: input.name || cart.hostName || me.name || "Group host", email: me.email || "", phone: input.phone || me.phone || "9810000000" },
      items, amounts, promoCode: promo ? "FOODIE50" : "",
      address: input.address, paymentMethod: input.paymentMethod,
      status: "received", userSub: me.sub, driverSub: "",
      deliveryPoint: pointForOrder("gc" + cart.code),
      timeline: [{ status: "received", at: new Date().toISOString() }],
      rating: null, groupCartId: cart._id, splits: groupSplits(cart, promo),
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order);
    cart.status = "ordered"; cart.orderId = order.orderId; cart.version += 1;
    save(db);
    return { cart: clone(groupView(cart, promo)), order: clone(order) };
  },

  // --- Tiffin subscriptions (mirror of subscriptionController) -----------
  async tiffinPlans() {
    return { plans: clone(TIFFIN_PLANS), policy: TIFFIN_POLICY, cutoff: "21:00 IST, day before" };
  },

  async subscribe(planId: string, input: { address: string; paymentMethod: string; startDate?: string }) {
    const db = load(); const me = myProfile(db);
    const plan = TIFFIN_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error("Unknown plan.");
    if (!input.address.trim()) throw new Error("A delivery address is required.");
    const today = istKey();
    let startDate = input.startDate && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ? input.startDate : addDaysKey(today, 1);
    if (startDate < today) startDate = today;
    const sub: Subscription = {
      _id: "sub-" + Math.random().toString(36).slice(2, 10), id: "",
      userSub: me.sub, planId: plan.id, planName: plan.name, pricePaid: plan.price,
      paymentMethod: input.paymentMethod, address: input.address.trim(),
      startDate, endDate: addDaysKey(startDate, plan.periodDays - 1),
      mealsTotal: plan.meals, mealsUsed: 0, status: "active",
      pausedFrom: "", pausedUntil: "", skippedDates: [],
      mealsLeft: plan.meals, todayStatus: "active",
      ledger: [{ date: startDate, type: "purchase", mealsDelta: plan.meals, at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    sub.id = sub._id;
    db.subscriptions.unshift(sub); save(db);
    return clone(subView(sub));
  },

  async mySubscriptions() {
    const db = load(); const me = myProfile(db);
    const mine = db.subscriptions.filter((s) => s.userSub === me.sub);
    let changed = false;
    for (const sub of mine) {
      if (sub.status === "active" && istKey() > sub.endDate) { sub.status = sub.mealsUsed >= sub.mealsTotal ? "exhausted" : "expired"; changed = true; }
      if (sub.status === "paused" && sub.pausedUntil && istKey() > sub.pausedUntil) { sub.status = "active"; sub.pausedFrom = ""; sub.pausedUntil = ""; changed = true; }
      const before = sub.mealsUsed;
      materialiseToday(db, sub);
      if (sub.mealsUsed !== before) changed = true;
    }
    if (changed) save(db);
    return clone(mine.map(subView));
  },

  async skipTiffinDay(id: string, date: string) {
    const db = load(); const me = myProfile(db);
    const sub = db.subscriptions.find((s) => s._id === id && s.userSub === me.sub);
    if (!sub) throw new Error("No such subscription.");
    if (sub.status !== "active") throw new Error("Only an active plan can skip a day.");
    if (date < sub.startDate || date > sub.endDate) throw new Error("That date is outside your plan.");
    if (sub.skippedDates.includes(date)) throw new Error("That day is already skipped.");
    if (sub.ledger.some((l) => l.type === "materialise" && l.date === date)) throw new Error("That day's meal is already on its way.");
    if (!beforeCutoffFor(date)) throw new Error("Too late — changes for that day closed at 9:00 PM the day before.");
    sub.skippedDates.push(date);
    sub.endDate = addDaysKey(sub.endDate, 1);
    sub.ledger.push({ date, type: "skip", mealsDelta: 0, at: new Date().toISOString() });
    save(db);
    return clone(subView(sub));
  },

  async pauseTiffin(id: string, days: number) {
    const db = load(); const me = myProfile(db);
    const sub = db.subscriptions.find((s) => s._id === id && s.userSub === me.sub);
    if (!sub) throw new Error("No such subscription.");
    if (sub.status !== "active") throw new Error("Only an active plan can be paused.");
    const today = istKey();
    const from = sub.ledger.some((l) => l.type === "materialise" && l.date === today) ? addDaysKey(today, 1) : today;
    sub.status = "paused";
    sub.pausedFrom = from;
    sub.pausedUntil = addDaysKey(from, days - 1);
    sub.endDate = addDaysKey(sub.endDate, days);
    sub.ledger.push({ date: from, type: "pause", mealsDelta: 0, at: new Date().toISOString() });
    save(db);
    return clone(subView(sub));
  },

  async resumeTiffin(id: string) {
    const db = load(); const me = myProfile(db);
    const sub = db.subscriptions.find((s) => s._id === id && s.userSub === me.sub);
    if (!sub) throw new Error("No such subscription.");
    if (sub.status !== "paused") throw new Error("This plan is not paused.");
    sub.status = "active";
    sub.pausedFrom = "";
    sub.pausedUntil = "";
    sub.ledger.push({ date: istKey(), type: "resume", mealsDelta: 0, at: new Date().toISOString() });
    save(db);
    return clone(subView(sub));
  },

  async setDishMeta(name: string, meta: Partial<DishMetaData>) {
    const db = load();
    const dish = dishByName(name);
    const base: DishMetaData = db.dishMeta[name] || (dish
      ? { dietary: dish.dietary, allergens: dish.allergens, nutritionPerServing: dish.nutritionPerServing }
      : { dietary: { jain: false, sattvic: false, noOnionGarlic: false }, allergens: [], nutritionPerServing: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } });
    db.dishMeta[name] = {
      dietary: { ...base.dietary, ...(meta.dietary || {}) },
      allergens: meta.allergens ? [...meta.allergens] : [...base.allergens],
      nutritionPerServing: { ...base.nutritionPerServing, ...(meta.nutritionPerServing || {}) },
    };
    save(db);
  },
};
