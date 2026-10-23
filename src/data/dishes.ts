// The menu catalog — the single source of truth for dishes on the site.
// Prices here must match the backend's price list (foodie-server
// src/utils/pricing.js); the server recomputes every order from its own
// list, so a mismatch would change what the customer is charged.

export interface Dish {
  name: string;
  price: number;
  category: string;
  veg: boolean;
  tag?: string;
  img: string; // file name inside public/images
  blurb: string;
  keywords: string;
}

export const imgUrl = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;

export const CATEGORIES = ["All", "Fast Food", "Italian", "Indian", "Drinks", "Desserts"];

export const DISHES: Dish[] = [
  { name: "Burger", price: 40, category: "Fast Food", veg: true, img: "buger.jpg", blurb: "Crispy patty, fresh veggies and house sauce in a toasted bun.", keywords: "burger bun snack fast food cheese patty veg" },
  { name: "Pasta", price: 250, category: "Italian", veg: true, img: "pasta.jpg", blurb: "Creamy white-sauce pasta with herbs and a garlic-butter finish.", keywords: "pasta italian creamy white sauce noodles veg" },
  { name: "Lasagna", price: 200, category: "Italian", veg: true, img: "lasagna.webp", blurb: "Layered pasta sheets, rich tomato sauce and melted cheese, baked fresh.", keywords: "lasagna italian cheese baked pasta veg" },
  { name: "Chocolate Drink", price: 60, category: "Drinks", veg: true, img: "chocolate_Drink.jpg", blurb: "Chilled chocolate shake topped with cocoa and cream.", keywords: "chocolate drink shake cold beverage sweet cocoa" },
  { name: "Pizza", price: 120, category: "Italian", veg: true, tag: "Bestseller", img: "pizza.jpg", blurb: "Hand-tossed base, tangy tomato sauce and a loaded cheese topping.", keywords: "pizza cheese italian fast food veg" },
  { name: "Hot Dog", price: 20, category: "Fast Food", veg: false, img: "Hot_dog.jpg", blurb: "Grilled sausage in a soft bun with mustard and crispy onions.", keywords: "hot dog sausage snack fast food non veg" },
  { name: "Juice", price: 50, category: "Drinks", veg: true, img: "juse.jpg", blurb: "Fresh-pressed seasonal fruit juice, nothing added.", keywords: "juice fresh fruit drink beverage healthy" },
  { name: "Biryani", price: 180, category: "Indian", veg: true, tag: "Bestseller", img: "biryani.webp", blurb: "Fragrant basmati layered with spiced vegetables and saffron.", keywords: "biryani rice indian spicy hyderabadi veg" },
  { name: "Chocolate", price: 30, category: "Desserts", veg: true, img: "chocolate.jpg", blurb: "Rich and smooth — the perfect sweet finish to any meal.", keywords: "chocolate sweet dessert cocoa" },
  { name: "Ice Cream", price: 10, category: "Desserts", veg: true, img: "ice_cream.jpg", blurb: "A classic creamy scoop, served perfectly chilled.", keywords: "ice cream dessert sweet cold scoop" },
  { name: "Spanchi", price: 60, category: "Indian", veg: true, img: "Spanchi.jpg", blurb: "A house special, prepared fresh in our kitchen every day.", keywords: "spanchi house special indian veg" },
  { name: "Sandwich", price: 25, category: "Fast Food", veg: true, img: "sandwich.jpg", blurb: "Grilled triple-layer sandwich with mint chutney and crunchy veggies.", keywords: "sandwich grilled snack breakfast veg" },
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
