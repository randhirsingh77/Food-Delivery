import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";

export function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-tag">
          <h2>Location</h2>
          <p>New Delhi, India</p>
          <p>Delivery: all of New Delhi</p>
        </div>
        <div className="footer-tag">
          <h2>Quick Links</h2>
          <ul>
            {["Home", "About", "Menu", "Gallery", "Order"].map((x) => (
              <li key={x}><a href={`#${x}`}>{x}</a></li>
            ))}
          </ul>
        </div>
        <div className="footer-tag">
          <h2>Contact</h2>
          <p><a href="mailto:rs6201849307@gmail.com">rs6201849307@gmail.com</a></p>
          <p>New Delhi, India</p>
        </div>
        <div className="footer-tag">
          <h2>Opening Hours</h2>
          <p>Mon – Sun</p>
          <p>11:00 AM – 11:00 PM</p>
          <p>Delivery in 30–40 min</p>
        </div>
        <div className="footer-tag">
          <h2>Follow</h2>
          <p className="socials">
            <a href="https://github.com/randhirsingh77" target="_blank" rel="noopener" aria-label="GitHub">
              <i className="fa-brands fa-github" aria-hidden="true" />
            </a>
            <a href="https://randhirsingh77.github.io/portfolio/" target="_blank" rel="noopener" aria-label="Portfolio">
              <i className="fa-solid fa-globe" aria-hidden="true" />
            </a>
            <a href="mailto:rs6201849307@gmail.com" aria-label="Email">
              <i className="fa-solid fa-envelope" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
      <p className="end">© {new Date().getFullYear()} Foodie · Design by <span>Randhir Singh</span></p>
    </footer>
  );
}

// Small bottom toast for feedback ("Added Pasta to your cart", errors…).
// Re-renders on every new message; auto-hides after ~3.2 s like the original.
export function Toast() {
  const toastMsg = useStore((s) => s.toastMsg);
  const toastKey = useStore((s) => s.toastKey);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toastMsg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [toastMsg, toastKey]);

  if (!toastMsg) return null;
  return (
    <div className={`toast${visible ? " show" : ""}`} role="status" aria-live="polite">
      {toastMsg}
    </div>
  );
}
