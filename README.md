# Food Delivery — Foodie

A food-delivery web app built with **React + TypeScript**. Browse the menu, save favourites, add dishes to the cart and place an order from the working checkout. Login is handled by Auth0 (email/phone + password, or Google).

**Live:** https://randhirsingh77.github.io/Food-Delivery/

## Features

- Menu with 12 dishes, photos, prices, ratings, veg/non-veg badges and Bestseller tags
- Working cart — add/remove items, quantities, promo code (FOODIE50), free-delivery progress, totals saved in your browser
- Favourites — tap the heart on any dish, filter the menu by favourites
- Smart search — scored matches plus "You may also like" suggestions, tap a result to jump to the dish
- Category filter chips
- Login / signup with Auth0 — email or phone number + password, Continue with Google, forgot/change password by email
- Order form with validation, live total estimate, and an on-page confirmation with order ID, ETA and a live status tracker
- Fully responsive — mobile menu, layouts adapt from phone to desktop

## Tech

React 18 · TypeScript · Vite · Zustand (state) · Auth0 (auth) — deployed to GitHub Pages by GitHub Actions on every push to `main`.

## Project structure

```
index.html              page shell (SEO meta, fonts)
public/images/          dish photos and site images
src/
  main.tsx              entry — mounts the app inside the Auth0 provider
  App.tsx               page composition
  index.css             all styles
  data/dishes.ts        the menu catalog + search scoring
  store/useStore.ts     cart / favourites / UI state (Zustand, persisted)
  utils/pricing.ts      promo + delivery-fee rules
  components/           Header, CartPanel, AccountPanel, SearchOverlay,
                        MenuSection, DishCard, Gallery, OrderSection, …
  auth/AuthProvider.tsx Auth0 setup
```

## Full stack

This repo is the frontend. The backend lives in
[foodie-server](https://github.com/randhirsingh77/foodie-server) — an
Express + MongoDB API that saves the orders placed on this site.

## Run it locally

```bash
npm install
npm run dev
```

Build for production with `npm run build` (output in `dist/`).
