import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served from the /Food-Delivery/ sub-path on GitHub Pages,
// so all built asset URLs are prefixed with it.
export default defineConfig({
  plugins: [react()],
  base: "/Food-Delivery/",
});
