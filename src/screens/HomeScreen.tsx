import { About, Hero } from "../components/Sections";
import { Gallery, MenuSection } from "../components/MenuGallery";
import OrderSection from "../components/OrderSection";

// The shop itself: hero, about, menu, gallery and the order form — the
// same single-page storefront Foodie has always been.
export default function HomeScreen() {
  return (
    <main>
      <Hero />
      <About />
      <MenuSection />
      <Gallery />
      <OrderSection />
    </main>
  );
}
