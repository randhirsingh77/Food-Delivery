import { create } from "zustand";
import type { Profile } from "../api/types";
import { dishByName } from "../data/dishes";
import { inr } from "../utils/pricing";

// One store for the whole app (Zustand — the same library used on the
// Pehlwan app). Cart, favourites and the applied promo are persisted to
// localStorage; panel/menu UI state is kept in memory only.

export type CartMap = Record<string, number>; // dish name -> quantity

interface FoodieState {
  // persisted
  cart: CartMap;
  favs: string[];
  promoApplied: boolean;
  // ui state
  cartOpen: boolean;
  accountOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  favsOnly: boolean;
  category: string;
  query: string;
  view: "shop" | "profile" | "admin" | "kitchen" | "driver" | "track" | "auth" | "group";
  authMode: "login" | "signup";
  trackOrderId: string;
  groupCode: string;
  authProfile: Profile | null; // signed-in user (own auth system)
  orderItemsText: string; // gallery "Order Now" for non-menu items lands here
  toastMsg: string;
  toastKey: number;
  // actions
  addToCart: (name: string) => void;
  setQty: (name: string, qty: number) => void;
  clearCart: () => void;
  toggleFav: (name: string) => void;
  setPromoApplied: (v: boolean) => void;
  setCartOpen: (v: boolean) => void;
  setAccountOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setFavsOnly: (v: boolean) => void;
  setCategory: (v: string) => void;
  setQuery: (v: string) => void;
  setView: (v: FoodieState["view"]) => void;
  setAuthMode: (v: "login" | "signup") => void;
  openTrack: (orderId: string) => void;
  openGroup: (code: string) => void;
  setGroupCode: (code: string) => void;
  setAuthProfile: (p: Profile | null) => void;
  setOrderItemsText: (v: string) => void;
  showToast: (msg: string) => void;
}

const STORE_KEY = "foodie-store";

function loadPersisted(): { cart: CartMap; favs: string[]; promoApplied: boolean } {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { cart: p.cart || {}, favs: p.favs || [], promoApplied: Boolean(p.promoApplied) };
    }
  } catch { /* fall through to legacy keys */ }
  // First run after the React migration: adopt the old site's saved data —
  // "foodie-cart" was a JSON array of [name, item] Map entries,
  // "foodie-favs" an array of names, "foodie-promo" the applied code.
  const cart: CartMap = {};
  try {
    (JSON.parse(localStorage.getItem("foodie-cart") || "[]") as [string, { qty: number }][])
      .forEach(([name, item]) => { if (dishByName(name) && item?.qty > 0) cart[name] = item.qty; });
  } catch { /* ignore */ }
  let favs: string[] = [];
  try {
    favs = (JSON.parse(localStorage.getItem("foodie-favs") || "[]") as string[]).filter((n) => dishByName(n));
  } catch { /* ignore */ }
  let promoApplied = false;
  try { promoApplied = localStorage.getItem("foodie-promo") === "FOODIE50"; } catch { /* ignore */ }
  return { cart, favs, promoApplied };
}

export const useStore = create<FoodieState>()((set, get) => ({
  ...loadPersisted(),
  cartOpen: false,
  accountOpen: false,
  searchOpen: false,
  menuOpen: false,
  favsOnly: false,
  category: "All",
  query: "",
  view: "shop",
  authMode: "login",
  trackOrderId: "",
  groupCode: "",
  authProfile: null,
  orderItemsText: "",
  toastMsg: "",
  toastKey: 0,

  addToCart: (name) => {
    const dish = dishByName(name);
    if (!dish) return;
    set((s) => ({ cart: { ...s.cart, [name]: (s.cart[name] || 0) + 1 } }));
    get().showToast(`Added ${dish.name} (${inr(dish.price)}) to your cart`);
  },
  setQty: (name, qty) =>
    set((s) => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[name];
      else cart[name] = qty;
      return { cart };
    }),
  clearCart: () => set({ cart: {}, promoApplied: false }),
  toggleFav: (name) =>
    set((s) => ({ favs: s.favs.includes(name) ? s.favs.filter((f) => f !== name) : [...s.favs, name] })),
  setPromoApplied: (v) => set({ promoApplied: v }),
  setCartOpen: (v) => set({ cartOpen: v, ...(v ? { accountOpen: false } : {}) }),
  setAccountOpen: (v) => set({ accountOpen: v, ...(v ? { cartOpen: false } : {}) }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setMenuOpen: (v) => set({ menuOpen: v }),
  setFavsOnly: (v) => set({ favsOnly: v }),
  setCategory: (v) => set({ category: v }),
  setQuery: (v) => set({ query: v }),
  setView: (v) => set({ view: v }),
  setAuthMode: (v) => set({ authMode: v }),
  openTrack: (orderId) => set({ trackOrderId: orderId, view: "track" }),
  openGroup: (code) => set({ groupCode: code.toUpperCase(), view: "group" }),
  setGroupCode: (code) => set({ groupCode: code.toUpperCase() }),
  setAuthProfile: (p) => set({ authProfile: p }),
  setOrderItemsText: (v) => set({ orderItemsText: v }),
  showToast: (msg) => set({ toastMsg: msg, toastKey: Date.now() }),
}));

// Persist only the durable slices, on every change.
useStore.subscribe((s) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ cart: s.cart, favs: s.favs, promoApplied: s.promoApplied }));
  } catch { /* storage unavailable */ }
});

// Selectors ---------------------------------------------------------------
export const cartCount = (s: FoodieState) => Object.values(s.cart).reduce((a, b) => a + b, 0);
export const cartSubtotal = (s: FoodieState) =>
  Object.entries(s.cart).reduce((sum, [name, qty]) => sum + (dishByName(name)?.price || 0) * qty, 0);
export const cartSummary = (s: FoodieState) =>
  Object.entries(s.cart).map(([name, qty]) => `${name} × ${qty}`).join(", ");
