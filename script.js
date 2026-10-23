// Foodie — cart, favourites, search, mobile nav and order flow.
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const inr = (n) => "₹" + n.toLocaleString("en-IN");

  /* ---------- Dish data from the menu cards ---------- */
  const dishes = new Map(); // name -> price
  $$(".menu-card").forEach((card) => {
    dishes.set(card.dataset.name, Number(card.dataset.price));
  });

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => (toast.hidden = true), 260);
    }, 2400);
  }

  /* ---------- Cart ---------- */
  const cart = new Map(); // name -> {name, price, qty}
  try {
    const saved = JSON.parse(localStorage.getItem("foodie-cart") || "[]");
    saved.forEach(([name, item]) => {
      if (dishes.has(name)) cart.set(name, item);
    });
  } catch (e) { /* storage unavailable — cart just won't persist */ }

  const cartCount = $("#cartCount"), cartItems = $("#cartItems"),
        cartEmpty = $("#cartEmpty"), cartFoot = $("#cartFoot"), cartTotal = $("#cartTotal");

  function cartQty() { let n = 0; cart.forEach((i) => (n += i.qty)); return n; }
  function cartSum() { let n = 0; cart.forEach((i) => (n += i.qty * i.price)); return n; }
  function cartSummary() {
    return Array.from(cart.values()).map((i) => `${i.name} × ${i.qty}`).join(", ");
  }

  function saveCart() {
    try { localStorage.setItem("foodie-cart", JSON.stringify(Array.from(cart.entries()))); } catch (e) {}
  }

  function renderCart() {
    const n = cartQty();
    cartCount.hidden = n === 0;
    cartCount.textContent = n;
    cartItems.innerHTML = "";
    cartEmpty.hidden = n !== 0;
    cartFoot.hidden = n === 0;
    cart.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="ci-name">${item.name}</span>` +
        `<span class="qty-controls">
           <button type="button" data-act="dec" data-name="${item.name}" aria-label="Remove one ${item.name}">−</button>
           <span>${item.qty}</span>
           <button type="button" data-act="inc" data-name="${item.name}" aria-label="Add one ${item.name}">+</button>
         </span>` +
        `<span class="ci-price">${inr(item.price * item.qty)}</span>`;
      cartItems.appendChild(li);
    });
    cartTotal.textContent = inr(cartSum());
    saveCart();
    syncOrderForm();
  }

  cartItems.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const item = cart.get(btn.dataset.name);
    if (!item) return;
    if (btn.dataset.act === "inc") item.qty += 1;
    else item.qty -= 1;
    if (item.qty <= 0) cart.delete(item.name);
    renderCart();
  });

  function addToCart(name) {
    const price = dishes.get(name);
    if (price === undefined) return;
    const item = cart.get(name) || { name, price, qty: 0 };
    item.qty += 1;
    cart.set(name, item);
    renderCart();
    showToast(`Added ${name} (${inr(price)}) to your cart`);
  }

  $$(".order-add").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.closest(".menu-card").dataset.name));
  });

  /* ---------- Cart panel ---------- */
  const cartPanel = $("#cartPanel"), cartToggle = $("#cartToggle");
  function setCartOpen(open) {
    cartPanel.hidden = !open;
    cartToggle.setAttribute("aria-expanded", String(open));
  }
  cartToggle.addEventListener("click", () => setCartOpen(cartPanel.hidden));
  $("#cartClose").addEventListener("click", () => setCartOpen(false));
  document.addEventListener("click", (e) => {
    if (!cartPanel.hidden && !cartPanel.contains(e.target) && !cartToggle.contains(e.target)) setCartOpen(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setCartOpen(false); });
  $("#checkoutBtn").addEventListener("click", () => {
    setCartOpen(false);
    syncOrderForm();
    document.getElementById("Order").scrollIntoView({ behavior: "smooth" });
    showToast("Review your details and place the order");
  });

  /* ---------- Favourites ---------- */
  const favs = new Set();
  try { (JSON.parse(localStorage.getItem("foodie-favs") || "[]")).forEach((n) => dishes.has(n) && favs.add(n)); } catch (e) {}
  const favCount = $("#favCount");
  function renderFavs() {
    favCount.hidden = favs.size === 0;
    favCount.textContent = favs.size;
    $$(".menu-card").forEach((card) => {
      const on = favs.has(card.dataset.name);
      const btn = $(".fav-btn", card);
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
      if (favOnly && !on) card.style.display = "none";
      else if (!searchQuery || card.dataset.name.toLowerCase().includes(searchQuery)) card.style.display = "";
      else card.style.display = "none";
    });
    try { localStorage.setItem("foodie-favs", JSON.stringify(Array.from(favs))); } catch (e) {}
  }
  $$(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.closest(".menu-card").dataset.name;
      if (favs.has(name)) { favs.delete(name); showToast(`Removed ${name} from favourites`); }
      else { favs.add(name); showToast(`Saved ${name} to favourites`); }
      renderFavs();
    });
  });

  let favOnly = false;
  const favToggle = $("#favToggle");
  favToggle.addEventListener("click", () => {
    favOnly = !favOnly;
    favToggle.setAttribute("aria-expanded", String(favOnly));
    favToggle.style.color = favOnly ? "#e03131" : "";
    if (favOnly && favs.size === 0) {
      favOnly = false;
      favToggle.setAttribute("aria-expanded", "false");
      favToggle.style.color = "";
      showToast("No favourites yet — tap the heart on any dish");
      return;
    }
    renderFavs();
    if (favOnly) document.getElementById("Menu").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Search ---------- */
  let searchQuery = "";
  const searchBar = $("#searchBar"), searchInput = $("#searchInput"), searchToggle = $("#searchToggle");
  function applySearch() {
    let visible = 0;
    $$(".menu-card").forEach((card) => {
      const match = !searchQuery || card.dataset.name.toLowerCase().includes(searchQuery);
      const favOk = !favOnly || favs.has(card.dataset.name);
      card.style.display = match && favOk ? "" : "none";
      if (match && favOk) visible += 1;
    });
    $("#noResults").hidden = visible !== 0;
  }
  searchToggle.addEventListener("click", () => {
    const open = searchBar.hidden;
    searchBar.hidden = !open;
    searchToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      searchInput.focus();
      document.getElementById("Menu").scrollIntoView({ behavior: "smooth" });
    }
  });
  $("#searchClose").addEventListener("click", () => {
    searchBar.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
    searchInput.value = ""; searchQuery = ""; applySearch();
  });
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    applySearch();
  });

  /* ---------- Gallery order buttons ---------- */
  const fItems = $("#fItems"), fQty = $("#fQty");
  $$(".gallery-order").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.add) { addToCart(btn.dataset.add); return; }
      fItems.value = btn.dataset.order;
      syncOrderForm();
      document.getElementById("Order").scrollIntoView({ behavior: "smooth" });
      showToast(`${btn.dataset.order} added — complete your details to order`);
    });
  });

  /* ---------- Mobile nav ---------- */
  const menuToggle = $("#menuToggle"), navLinks = $("#navLinks");
  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    $("i", menuToggle).className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
  });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    $("i", menuToggle).className = "fa-solid fa-bars";
  }));

  /* ---------- Order form ---------- */
  const form = $("#orderForm"), orderTotal = $("#orderTotal");
  function estimateTotal() {
    if (cart.size) return cartSum();
    const text = fItems.value.trim();
    if (!text) return null;
    // Single known dish -> price x quantity box; "Name x 2" style entries also work.
    let total = 0, matched = false;
    text.split(",").forEach((part) => {
      const m = part.trim().match(/^(.+?)(?:\s*[×x]\s*(\d+))?$/i);
      if (!m) return;
      const name = Array.from(dishes.keys()).find((d) => d.toLowerCase() === m[1].trim().toLowerCase());
      if (name) { matched = true; total += dishes.get(name) * (m[2] ? Number(m[2]) : Number(fQty.value) || 1); }
    });
    return matched ? total : null;
  }
  function syncOrderForm() {
    if (cart.size) {
      fItems.value = cartSummary();
      fQty.value = cartQty();
      fQty.disabled = true;
    } else {
      fQty.disabled = false;
    }
    const t = estimateTotal();
    orderTotal.textContent = t === null ? "—" : inr(t);
  }
  fItems.addEventListener("input", syncOrderForm);
  fQty.addEventListener("input", syncOrderForm);
  $$("input", form).forEach((inp) => inp.addEventListener("input", () => inp.classList.remove("invalid")));

  const success = $("#orderSuccess"), successText = $("#orderSuccessText");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    $$("input[required]", form).forEach((inp) => {
      const ok = inp.checkValidity();
      inp.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) { form.reportValidity(); return; }
    const name = $("#fName").value.trim();
    const address = $("#fAddress").value.trim();
    const total = estimateTotal();
    const orderId = "FD-" + Date.now().toString(36).toUpperCase().slice(-6);
    successText.textContent =
      `Thanks ${name}! Your order (${fItems.value.trim()})` +
      (total !== null ? ` totalling ${inr(total)}` : "") +
      ` will be delivered to ${address}. Order ID: ${orderId}.`;
    success.hidden = false;
    cart.clear();
    renderCart();
    form.reset();
    fQty.value = 1;
    syncOrderForm();
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#orderAgain").addEventListener("click", () => {
    success.hidden = true;
    document.getElementById("Menu").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Init ---------- */
  $("#year").textContent = new Date().getFullYear();
  renderFavs();
  renderCart();
})();
