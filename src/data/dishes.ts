// The menu catalog — the single source of truth for dishes on the site.
// Prices here must match the backend's price list (foodie-server
// src/utils/pricing.js); the server recomputes every order from its own
// list, so a mismatch would change what the customer is charged.
//
// Dietary flags and nutrition are the kitchen's DECLARED per-serving
// estimates (approximate). They mirror the backend's declared defaults
// (foodie-server src/utils/dishMeta.js) — keep the two in sync. The
// kitchen can correct any value from its dashboard; those corrections
// come back through the menu-state API and override what is written here.
//
// Jain is NOT the same as "no onion-garlic": Jain dishes also exclude
// root vegetables. Flags are declared per dish, never derived from veg.

export interface DishDietary {
  jain: boolean;
  sattvic: boolean;
  noOnionGarlic: boolean;
}

export interface DishNutrition {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Dish {
  name: string;
  price: number;
  category: string;
  veg: boolean;
  tag?: string;
  img: string; // file name inside public/images
  blurb: string;
  keywords: string;
  dietary: DishDietary;
  allergens: string[];
  nutritionPerServing: DishNutrition;
}

export const imgUrl = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;

export const CATEGORIES = ["All", "Fast Food", "Italian", "Indian", "Drinks", "Desserts"];

// "High protein" thresholds: at least 15 g protein per serving, at most
// 700 kcal, and protein at least 10% of the calories (protein ≈ 4 kcal/g).
// Mirrors the backend helper of the same name — keep them in sync.
export function isHighProteinNutrition(n: DishNutrition): boolean {
  return n.proteinG >= 15 && n.kcal <= 700 && n.kcal > 0 && (n.proteinG * 4) / n.kcal >= 0.1;
}

export function isHighProtein(dish: Dish): boolean {
  return isHighProteinNutrition(dish.nutritionPerServing);
}

export type DietaryFilter = "all" | "jain" | "sattvic" | "noOnionGarlic" | "highProtein";
export const DIETARY_FILTERS: { key: DietaryFilter; label: string }[] = [
  { key: "all", label: "All dishes" },
  { key: "jain", label: "Jain" },
  { key: "sattvic", label: "Sattvic" },
  { key: "noOnionGarlic", label: "No onion-garlic" },
  { key: "highProtein", label: "High protein" },
];

export function matchesDietary(dish: Dish, filter: DietaryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "highProtein") return isHighProtein(dish);
  return dish.dietary[filter];
}

const D = (jain: boolean, sattvic: boolean, noOnionGarlic: boolean): DishDietary => ({ jain, sattvic, noOnionGarlic });
const N = (kcal: number, proteinG: number, carbsG: number, fatG: number): DishNutrition => ({ kcal, proteinG, carbsG, fatG });

export const DISHES: Dish[] = [
  { name: "Burger", price: 40, category: "Fast Food", veg: true, img: "buger.jpg", blurb: "Crispy patty, fresh veggies and house sauce in a toasted bun.", keywords: "burger bun snack fast food cheese patty veg", dietary: D(false, false, false), allergens: ["gluten", "milk"], nutritionPerServing: N(320, 9, 38, 14) },
  { name: "Pasta", price: 250, category: "Italian", veg: true, img: "pasta.jpg", blurb: "Creamy white-sauce pasta with herbs and a garlic-butter finish.", keywords: "pasta italian creamy white sauce noodles veg", dietary: D(false, false, false), allergens: ["gluten", "milk"], nutritionPerServing: N(520, 18, 62, 22) },
  { name: "Lasagna", price: 200, category: "Italian", veg: true, img: "lasagna.webp", blurb: "Layered pasta sheets, rich tomato sauce and melted cheese, baked fresh.", keywords: "lasagna italian cheese baked pasta veg", dietary: D(false, false, false), allergens: ["gluten", "milk"], nutritionPerServing: N(480, 20, 45, 24) },
  { name: "Chocolate Drink", price: 60, category: "Drinks", veg: true, img: "chocolate_Drink.jpg", blurb: "Chilled chocolate shake topped with cocoa and cream.", keywords: "chocolate drink shake cold beverage sweet cocoa", dietary: D(true, true, true), allergens: ["milk"], nutritionPerServing: N(210, 6, 30, 7) },
  { name: "Pizza", price: 120, category: "Italian", veg: true, tag: "Bestseller", img: "pizza.jpg", blurb: "Hand-tossed base, tangy tomato sauce and a loaded cheese topping.", keywords: "pizza cheese italian fast food veg", dietary: D(false, false, false), allergens: ["gluten", "milk"], nutritionPerServing: N(540, 19, 58, 24) },
  { name: "Hot Dog", price: 20, category: "Fast Food", veg: false, img: "Hot_dog.jpg", blurb: "Grilled sausage in a soft bun with mustard and crispy onions.", keywords: "hot dog sausage snack fast food non veg", dietary: D(false, false, false), allergens: ["gluten", "mustard"], nutritionPerServing: N(290, 11, 26, 16) },
  { name: "Juice", price: 50, category: "Drinks", veg: true, img: "juse.jpg", blurb: "Fresh-pressed seasonal fruit juice, nothing added.", keywords: "juice fresh fruit drink beverage healthy", dietary: D(true, true, true), allergens: [], nutritionPerServing: N(110, 2, 26, 0) },
  { name: "Biryani", price: 180, category: "Indian", veg: true, tag: "Bestseller", img: "biryani.webp", blurb: "Fragrant basmati layered with spiced vegetables and saffron.", keywords: "biryani rice indian spicy hyderabadi veg", dietary: D(false, false, false), allergens: ["milk"], nutritionPerServing: N(460, 11, 62, 18) },
  { name: "Chocolate", price: 30, category: "Desserts", veg: true, img: "chocolate.jpg", blurb: "Rich and smooth — the perfect sweet finish to any meal.", keywords: "chocolate sweet dessert cocoa", dietary: D(true, true, true), allergens: ["milk", "soy"], nutritionPerServing: N(150, 2, 18, 8) },
  { name: "Ice Cream", price: 10, category: "Desserts", veg: true, img: "ice_cream.jpg", blurb: "A classic creamy scoop, served perfectly chilled.", keywords: "ice cream dessert sweet cold scoop", dietary: D(true, true, true), allergens: ["milk"], nutritionPerServing: N(120, 3, 15, 6) },
  { name: "Spanchi", price: 60, category: "Indian", veg: true, img: "Spanchi.jpg", blurb: "A house special, prepared fresh in our kitchen every day.", keywords: "spanchi house special indian veg", dietary: D(false, false, false), allergens: ["milk"], nutritionPerServing: N(240, 8, 20, 14) },
  { name: "Sandwich", price: 25, category: "Fast Food", veg: true, img: "sandwich.jpg", blurb: "Grilled triple-layer sandwich with mint chutney and crunchy veggies.", keywords: "sandwich grilled snack breakfast veg", dietary: D(false, false, false), allergens: ["gluten", "milk"], nutritionPerServing: N(210, 7, 28, 8) },
  { name: "Ghar Jaisa Thali", price: 130, category: "Indian", veg: true, tag: "Tiffin", img: "Food-Plate.png", blurb: "Four rotis, dal, seasonal sabzi, rice and salad — a full home-style meal, made without onion or garlic.", keywords: "thali tiffin meal home style lunch dinner subscription sattvic veg", dietary: D(false, true, true), allergens: ["gluten", "milk"], nutritionPerServing: N(620, 19, 88, 20) },
];

export const dishByName = (name: string) => DISHES.find((d) => d.name === name);

export const dishByNameCI = (name: string) =>
  DISHES.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

export interface GalleryItem {
  title: string;
  text: string;
  img: string;
  dish?: string; // set when the item is a real menu dish (adds it to the cart)
}

export const GALLERY: GalleryItem[] = [
  { title: "Sandwich", text: "Grilled fresh, stacked high.", img: "gallary_1.jpg", dish: "Sandwich" },
  { title: "Cup Cake", text: "Soft, sweet and baked this morning.", img: "gallary_2.jpg" },
  { title: "Chocolate Cup Cake", text: "For the serious chocolate lovers.", img: "gallary_3.jpg" },
  { title: "Bread", text: "Warm loaves, straight from the oven.", img: "gallary_4.jpg" },
  { title: "Pizza", text: "Cheesy, loaded and wood-fired style.", img: "gallary_5.jpg", dish: "Pizza" },
  { title: "Fruit Cake", text: "Topped with fresh seasonal fruit.", img: "gallary_6.jpg" },
];

// Search scoring, ported from the original site: exact name beats a prefix,
// a prefix beats a substring; keyword and category tokens add points.
export function scoreDish(dish: Dish, q: string): number {
  if (!q) return 0;
  const name = dish.name.toLowerCase();
  let score = 0;
  if (name === q) score += 120;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(q)) score += 60;
  q.split(/\s+/).forEach((tok) => {
    if (tok && dish.keywords.includes(tok)) score += 30;
    if (tok && dish.category.toLowerCase().includes(tok)) score += 20;
  });
  return score;
}

export function matchesQuery(dish: Dish, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    dish.name.toLowerCase().includes(needle) ||
    dish.keywords.includes(needle) ||
    dish.category.toLowerCase().includes(needle)
  );
}
