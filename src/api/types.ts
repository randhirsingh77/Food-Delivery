// Shared types for the Foodie platform API. The same shapes are served by
// the real backend (foodie-server) and by the built-in demo dataset used
// when no backend URL is configured.

export type Role = "customer" | "admin" | "manager" | "driver";
export type OrderStatus = "received" | "preparing" | "packing" | "on_the_way" | "delivered" | "cancelled";

export interface Address {
  _id?: string;
  label: string;
  line: string;
  city: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

export interface DriverInfo {
  vehicle: string;
  photoUrl: string;
  available: boolean;
  ratingAvg: number;
  ratingCount: number;
  earnings: number;
  deliveries: number;
}

export interface Profile {
  sub: string;
  email: string;
  name: string;
  phone: string;
  picture: string;
  role: Role;
  addresses: Address[];
  driver: DriverInfo;
}

export interface OrderItem { name: string; qty: number; price: number }
export interface OrderAmounts { subtotal: number; discount: number; delivery: number; total: number }

export interface Order {
  orderId: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  amounts: OrderAmounts;
  promoCode?: string;
  address: string;
  note?: string;
  paymentMethod: string;
  status: OrderStatus;
  userSub: string;
  driverSub: string;
  deliveryPoint?: { lat: number; lng: number };
  timeline: { status: OrderStatus; at: string }[];
  rating?: { stars: number; comment?: string; ratedAt?: string } | null;
  groupCartId?: string;
  splits?: GroupSplit[];
  subscriptionId?: string;
  createdAt: string;
}

export interface TrackData {
  orderId: string;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: string }[];
  restaurant: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number };
  rider: { lat: number; lng: number } | null;
  etaMinutes: number | null;
  // Queue-aware estimate while the order is with the kitchen (range +
  // the reason). Null once the rider is on the way or the order is done.
  etaLow?: number | null;
  etaHigh?: number | null;
  queueAhead?: number | null;
  avgPrepMinutes?: number | null;
  etaReason?: string | null;
  driver: { name: string; photoUrl: string; vehicle: string; ratingAvg: number; ratingCount: number } | null;
  rating: { stars: number } | null;
}

export interface Analytics {
  totals: { revenue: number; orders: number; avgOrderValue: number; delivered: number; activeDrivers: number };
  daily: { date: string; revenue: number; orders: number }[];
  topDishes: { name: string; qty: number; revenue: number }[];
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export interface GroupCartItem {
  _id: string;
  addedBySub: string;
  addedByName: string;
  name: string;
  qty: number;
  priceSnapshot: number;
}

export interface GroupSplit { sub: string; name: string; amountPaise: number }

export interface GroupCart {
  _id: string;
  id: string;
  hostSub: string;
  hostName: string;
  hostUpiId: string;
  code: string;
  status: "open" | "locked" | "ordered" | "expired";
  participants: { sub: string; name: string; joinedAt: string }[];
  items: GroupCartItem[];
  version: number;
  orderId: string;
  expiresAt: string;
  splits: GroupSplit[];
  createdAt: string;
}

export interface DishMetaData {
  dietary: { jain: boolean; sattvic: boolean; noOnionGarlic: boolean };
  allergens: string[];
  nutritionPerServing: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

export interface MenuStateRow extends Partial<DishMetaData> {
  name: string;
  available: boolean;
  isHighProtein?: boolean;
}

export interface DriverSummary {
  sub: string;
  name: string;
  picture: string;
  role: Role;
  driver?: DriverInfo;
}

export interface NewOrderPayload {
  orderId: string;
  customer: { name: string; email: string; phone: string };
  items: { name: string; qty: number }[];
  promoCode?: string;
  address: string;
  note?: string;
  paymentMethod: string;
  deliveryPoint?: { lat: number; lng: number };
}

export interface FoodieApi {
  // Own auth system (register/login/Google). Demo mode keeps accounts in
  // the demo dataset; HTTP mode talks to foodie-server /api/v1/auth.
  register(input: { name: string; email: string; phone: string; password: string }): Promise<{ token: string; profile: Profile }>;
  login(id: string, password: string): Promise<{ token: string; profile: Profile }>;
  googleDemo(): Promise<Profile>;
  forgot(email: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getProfile(): Promise<Profile>;
  updateProfile(patch: { name?: string; phone?: string; picture?: string; driver?: Partial<DriverInfo> }): Promise<Profile>;
  addAddress(a: Address): Promise<Profile>;
  deleteAddress(id: string): Promise<Profile>;
  listDrivers(): Promise<DriverSummary[]>;
  createOrder(payload: NewOrderPayload): Promise<Order>;
  myOrders(): Promise<Order[]>;
  queue(): Promise<Order[]>;
  accept(orderId: string): Promise<Order>;
  advance(orderId: string): Promise<Order>;
  rate(orderId: string, stars: number, comment?: string): Promise<Order>;
  track(orderId: string): Promise<TrackData>;
  analytics(): Promise<Analytics>;
  menuState(): Promise<MenuStateRow[]>;
  setMenuState(name: string, available: boolean): Promise<void>;
  setDishMeta(name: string, meta: Partial<DishMetaData>): Promise<void>;
  // Group ordering: shared cart, per-person split (see GroupCart).
  createGroupCart(hostUpiId?: string): Promise<GroupCart>;
  myGroupCarts(): Promise<GroupCart[]>;
  getGroupCart(code: string): Promise<GroupCart>;
  joinGroupCart(code: string): Promise<GroupCart>;
  addGroupItem(code: string, name: string, qty: number): Promise<GroupCart>;
  removeGroupItem(code: string, itemId: string): Promise<GroupCart>;
  lockGroupCart(code: string): Promise<GroupCart>;
  checkoutGroupCart(code: string, input: { address: string; paymentMethod: string; promoCode?: string; name?: string; phone?: string }): Promise<{ cart: GroupCart; order: Order }>;
}
