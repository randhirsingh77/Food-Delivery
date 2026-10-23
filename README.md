# Food Delivery — Foodie

A full food-delivery platform built with **React + TypeScript**: a working
storefront plus role-based dashboards for the owner, the kitchen and
delivery drivers — the same flows real apps like Zomato/Swiggy run on.

**Live:** https://randhirsingh77.github.io/Food-Delivery/ (repository is
currently private; the site returns when it is public again or on a paid
plan)

## What it does

**Customers**
- Menu with 12 dishes, photos, ratings, veg/non-veg badges, Bestseller tags — and live **out-of-stock** states set by the kitchen
- Working cart — quantities, promo code (FOODIE50), free-delivery progress, totals saved in your browser
- Favourites, category chips, smart search with "You may also like"
- **Own account system** — sign up with name + email + phone + password, login with email *or* phone, Continue with Google, forgot/change password
- Profile with editable details and a **saved-address book**
- **Live order tracking** — a real map with the rider moving to your door, ETA, the driver's photo, vehicle and rating; rate the driver after delivery

**Owner (admin)** — sales dashboard: revenue, orders, average order value, a 14-day sales graph, top dishes, orders by status

**Kitchen (manager)** — the live order queue (received → preparing → packing), driver overview, and **dish availability toggles**

**Drivers** — duty toggle, orders ready for pickup, accept → picked up → delivered, earnings wallet (₹40 per delivery) and their customer rating

Roles can be switched from the profile page in the demo, so every view can
be tried with one account.

## Tech

React 18 · TypeScript · Vite · Zustand · Recharts · Leaflet/OpenStreetMap.
One `FoodieApi` interface, two implementations: HTTP calls to the backend
when `VITE_API_URL` is set, otherwise a realistic built-in demo dataset in
the browser — so the site is fully usable before the backend is deployed.

## Project structure

```
index.html               page shell (SEO meta, fonts)
public/images/           dish photos and site images
src/
  main.tsx               entry
  App.tsx                view switching (shop / auth / dashboards / tracking)
  index.css              all styles — warm bistro design system
  data/dishes.ts         menu catalog + search scoring
  utils/pricing.ts       promo + delivery-fee rules (shared with backend)
  store/useStore.ts      cart / favourites / UI state / session (Zustand)
  api/                   types, HTTP client (JWT), demo dataset, profile hook
  screens/               HomeScreen, AuthScreen, ProfileScreen,
                         AdminScreen, KitchenScreen, DriverScreen, TrackScreen
  components/            Header, CartPanel, AccountPanel, SearchOverlay,
                         menu/gallery sections, checkout, dashboard shell
```

## Full stack

The backend lives in
[foodie-server](https://github.com/randhirsingh77/foodie-server) — an
Express + MongoDB API with its own auth (bcrypt + JWT, Google OAuth),
orders, kitchen/driver flows, tracking and analytics.

Set `VITE_API_URL` (see `.env.example`) to the backend's URL and rebuild
to connect the two.

## Run it locally

```bash
npm install
npm run dev
```

Build for production with `npm run build` (output in `dist/`, deployed by
GitHub Actions on every push to `main` once Pages is set to Actions).
