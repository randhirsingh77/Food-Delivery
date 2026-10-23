// Foodie — smart search, cart with offers, favourites, categories and order flow.
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const inr = (n) => "₹" + n.toLocaleString("en-IN");

  const FREE_DELIVERY_ABOVE = 499;
  const DELIVERY_FEE = 30;
  const PROMO = { code: "FOODIE50", minOrder: 299, pct: 50, cap: 100 };

  /* The header element, used to anchor the search overlay to the header's
     real bottom edge (see positionSearchOverlay in the search section).
     Nothing ever writes the header's height back into CSS, so the header
     can never feed its own growth. */
  const headerEl = $(".site-header");

  /* ---------- Dish catalog from the menu cards ---------- */
  const catalog = new Map(); // name -> {name, price, category, keywords, img, card}
  $$(".menu-card").forEach((card) => {
    catalog.set(card.dataset.name, {
      name: card.dataset.name,
      price: Number(card.dataset.price),
      category: card.dataset.category || "",
      keywords: (card.dataset.keywords || "").toLowerCase(),
      tag: card.dataset.tag || "",
      img: $("img", card) ? $("img", card).getAttribute("src") : "",
      card,
    });
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

  /* ---------- Pricing ---------- */
  let promoApplied = false;
  try { promoApplied = localStorage.getItem("foodie-promo") === PROMO.code; } catch (e) {}
  function breakdown(subtotal) {
    const discount = promoApplied && subtotal >= PROMO.minOrder
      ? Math.min(PROMO.cap, Math.round(subtotal * PROMO.pct / 100)) : 0;
    const delivery = subtotal === 0 || (subtotal - discount) >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    return { subtotal, discount, delivery, total: subtotal - discount + delivery };
  }

  /* ---------- Cart ---------- */
  const cart = new Map();
  try {
    (JSON.parse(localStorage.getItem("foodie-cart") || "[]")).forEach(([name, item]) => {
      if (catalog.has(name)) cart.set(name, item);
    });
  } catch (e) {}
  const cartCount = $("#cartCount"), cartItems = $("#cartItems"), cartEmpty = $("#cartEmpty"),
        cartFoot = $("#cartFoot"), cartTotalEl = $("#cartTotal");

  function cartQty() { let n = 0; cart.forEach((i) => (n += i.qty)); return n; }
  function cartSubtotal() { let n = 0; cart.forEach((i) => (n += i.qty * i.price)); return n; }
  function cartSummary() { return Array.from(cart.values()).map((i) => `${i.name} × ${i.qty}`).join(", "); }
  function saveCart() { try { localStorage.setItem("foodie-cart", JSON.stringify(Array.from(cart.entries()))); } catch (e) {} }

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
    const b = breakdown(cartSubtotal());
    $("#priceSubtotal").textContent = inr(b.subtotal);
    $("#discountRow").hidden = b.discount === 0;
    $("#priceDiscount").textContent = "−" + inr(b.discount);
    $("#priceDelivery").textContent = b.delivery === 0 ? "FREE" : inr(b.delivery);
    cartTotalEl.textContent = inr(b.total);
    $("#freeDelNote").textContent = b.delivery > 0
      ? `Add ${inr(FREE_DELIVERY_ABOVE - (b.subtotal - b.discount))} more for FREE delivery`
      : "You have got FREE delivery on this order";
    $("#checkoutBtn").textContent = `Checkout · ${inr(b.total)}`;
    saveCart();
    syncOrderForm();
  }

  cartItems.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const item = cart.get(btn.dataset.name);
    if (!item) return;
    item.qty += btn.dataset.act === "inc" ? 1 : -1;
    if (item.qty <= 0) cart.delete(item.name);
    renderCart();
  });

  function addToCart(name) {
    const dish = catalog.get(name);
    if (!dish) return;
    const item = cart.get(name) || { name, price: dish.price, qty: 0 };
    item.qty += 1;
    cart.set(name, item);
    renderCart();
    showToast(`Added ${name} (${inr(dish.price)}) to your cart`);
  }
  $$(".order-add").forEach((btn) =>
    btn.addEventListener("click", () => addToCart(btn.closest(".menu-card").dataset.name)));

  /* ---------- Promo code ---------- */
  const promoInput = $("#promoInput"), promoMsg = $("#promoMsg");
  function setPromoMsg(text, ok) {
    promoMsg.hidden = !text;
    promoMsg.textContent = text || "";
    promoMsg.className = "promo-msg " + (ok ? "ok" : "err");
  }
  $("#promoApply").addEventListener("click", () => {
    const code = promoInput.value.trim().toUpperCase();
    if (!code) { setPromoMsg("Enter a promo code first", false); return; }
    if (code !== PROMO.code) { promoApplied = false; setPromoMsg("That code is not valid. Try FOODIE50.", false); }
    else if (cartSubtotal() < PROMO.minOrder) {
      promoApplied = false;
      setPromoMsg(`FOODIE50 needs a subtotal of ${inr(PROMO.minOrder)} or more`, false);
    } else {
      promoApplied = true;
      setPromoMsg("FOODIE50 applied — 50% off up to ₹100", true);
    }
    try { localStorage.setItem("foodie-promo", promoApplied ? PROMO.code : ""); } catch (e) {}
    renderCart();
  });
  if (promoApplied) { promoInput.value = PROMO.code; }

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
  $("#checkoutBtn").addEventListener("click", () => {
    setCartOpen(false);
    syncOrderForm();
    document.getElementById("Order").scrollIntoView({ behavior: "smooth" });
    showToast("Review your details and place the order");
  });

  /* ---------- Unified menu filters (search + category + favourites) ---------- */
  const state = { query: "", category: "All", favOnly: false };
  function applyFilters() {
    let visible = 0;
    catalog.forEach((dish) => {
      const q = state.query;
      const matchQ = !q || dish.name.toLowerCase().includes(q) || dish.keywords.includes(q) || dish.category.toLowerCase().includes(q);
      const matchC = state.category === "All" || dish.category === state.category;
      const matchF = !state.favOnly || favs.has(dish.name);
      const show = matchQ && matchC && matchF;
      dish.card.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    $("#noResults").hidden = visible !== 0;
  }
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      state.category = chip.dataset.cat;
      applyFilters();
    });
  });

  /* ---------- Favourites ---------- */
  const favs = new Set();
  try { (JSON.parse(localStorage.getItem("foodie-favs") || "[]")).forEach((n) => catalog.has(n) && favs.add(n)); } catch (e) {}
  const favCount = $("#favCount"), favToggle = $("#favToggle");
  function renderFavs() {
    favCount.hidden = favs.size === 0;
    favCount.textContent = favs.size;
    catalog.forEach((dish) => {
      const btn = $(".fav-btn", dish.card);
      const on = favs.has(dish.name);
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    try { localStorage.setItem("foodie-favs", JSON.stringify(Array.from(favs))); } catch (e) {}
    applyFilters();
  }
  $$(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.closest(".menu-card").dataset.name;
      if (favs.has(name)) { favs.delete(name); showToast(`Removed ${name} from favourites`); }
      else { favs.add(name); showToast(`Saved ${name} to favourites`); }
      renderFavs();
    });
  });
  favToggle.addEventListener("click", () => {
    if (!state.favOnly && favs.size === 0) { showToast("No favourites yet — tap the heart on any dish"); return; }
    state.favOnly = !state.favOnly;
    favToggle.setAttribute("aria-expanded", String(state.favOnly));
    favToggle.style.color = state.favOnly ? "#e03131" : "";
    applyFilters();
    if (state.favOnly) document.getElementById("Menu").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Smart sticky search ---------- */
  const overlay = $("#searchOverlay"), searchInput = $("#searchInput"),
        suggestions = $("#suggestions"), searchHint = $("#searchHint"), searchToggle = $("#searchToggle");

  function scoreDish(dish, q) {
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

  function suggestionItem(dish) {
    const li = document.createElement("li");
    li.innerHTML =
      `<img src="${dish.img}" alt="" loading="lazy" />
       <span class="sg-main"><span class="sg-name">${dish.name}</span>
       <span class="sg-sub">${dish.category}${dish.tag ? " · " + dish.tag : ""}</span></span>
       <span class="sg-price">${inr(dish.price)}</span>
       <button type="button" class="sg-add" data-add="${dish.name}">Add</button>`;
    li.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      goToDish(dish);
    });
    return li;
  }

  function goToDish(dish) {
    closeSearch();
    // Make sure the card is visible before scrolling to it.
    state.query = ""; state.category = "All"; state.favOnly = false;
    favToggle.style.color = "";
    $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === "All"));
    applyFilters();
    dish.card.scrollIntoView({ behavior: "smooth", block: "center" });
    dish.card.classList.remove("highlight");
    void dish.card.offsetWidth;
    dish.card.classList.add("highlight");
  }

  function renderSuggestions() {
    const q = searchInput.value.trim().toLowerCase();
    suggestions.innerHTML = "";
    if (!q) {
      searchHint.textContent = "Popular right now: Pizza · Biryani · Burger";
      const popular = Array.from(catalog.values()).filter((d) => d.tag === "Bestseller")
        .concat([catalog.get("Burger")]).filter(Boolean);
      popular.forEach((d) => suggestions.appendChild(suggestionItem(d)));
      return;
    }
    searchHint.textContent = "Tap a dish to jump to it, or Add it straight to your cart.";
    const scored = Array.from(catalog.values())
      .map((d) => ({ d, s: scoreDish(d, q) })).filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    if (!scored.length) {
      const li = document.createElement("li");
      li.className = "sg-none";
      li.textContent = `No dish matches "${searchInput.value.trim()}". Try "pizza", "sweet" or "drink".`;
      suggestions.appendChild(li);
      return;
    }
    const results = scored.slice(0, 5).map((x) => x.d);
    results.forEach((d) => suggestions.appendChild(suggestionItem(d)));
    // Similar dishes: same category as the best match, not already shown.
    const topCat = results[0].category;
    const similar = Array.from(catalog.values())
      .filter((d) => d.category === topCat && !results.includes(d)).slice(0, 3);
    if (similar.length) {
      const head = document.createElement("li");
      head.className = "sg-similar-head";
      head.textContent = "You may also like";
      suggestions.appendChild(head);
      similar.forEach((d) => suggestions.appendChild(suggestionItem(d)));
    }
  }

  suggestions.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) addToCart(addBtn.dataset.add);
  });

  function positionSearchOverlay() {
    // Anchor the overlay to the header's actual bottom edge, measured at
    // this moment — correct whether the header is one row or two, and
    // whether the mobile menu is open or closed.
    if (headerEl) overlay.style.top = headerEl.getBoundingClientRect().bottom + "px";
  }

  function openSearch() {
    positionSearchOverlay();
    overlay.hidden = false;
    searchToggle.setAttribute("aria-expanded", "true");
    renderSuggestions();
    setTimeout(() => searchInput.focus(), 30);
  }
  function closeSearch() {
    overlay.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
  }
  searchToggle.addEventListener("click", () => (overlay.hidden ? openSearch() : closeSearch()));
  window.addEventListener("resize", () => { if (!overlay.hidden) positionSearchOverlay(); });
  $("#searchClose").addEventListener("click", () => {
    searchInput.value = ""; state.query = ""; applyFilters(); closeSearch();
  });
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    applyFilters();
    renderSuggestions();
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const first = $(".suggestions .sg-add");
    if (first) {
      const dish = catalog.get(first.dataset.add);
      if (dish) goToDish(dish);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSearch(); setCartOpen(false); }
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
    closeSearch();
  }));

  /* ---------- Open-now badge (11 AM – 11 PM) ---------- */
  (function openBadge() {
    const el = $("#openBadge");
    const h = new Date().getHours();
    if (h >= 11 && h < 23) el.innerHTML = '<span class="dot"></span> Open now · till 11 PM';
    else { el.classList.add("closed"); el.innerHTML = '<span class="dot"></span> Closed · opens 11 AM'; }
  })();

  /* ---------- Order form ---------- */
  const form = $("#orderForm"), orderTotal = $("#orderTotal");
  function typedItemsTotal() {
    const text = fItems.value.trim();
    if (!text) return null;
    let total = 0, matched = false;
    text.split(",").forEach((part) => {
      const m = part.trim().match(/^(.+?)(?:\s*[×x]\s*(\d+))?$/i);
      if (!m) return;
      const dish = Array.from(catalog.values()).find((d) => d.name.toLowerCase() === m[1].trim().toLowerCase());
      if (dish) { matched = true; total += dish.price * (m[2] ? Number(m[2]) : Number(fQty.value) || 1); }
    });
    return matched ? total : null;
  }
  function syncOrderForm() {
    if (cart.size) {
      fItems.value = cartSummary();
      fQty.value = cartQty();
      fQty.disabled = true;
      orderTotal.textContent = inr(breakdown(cartSubtotal()).total);
      return;
    }
    fQty.disabled = false;
    const t = typedItemsTotal();
    orderTotal.textContent = t === null ? "—" : inr(breakdown(t).total);
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
    const total = cart.size ? breakdown(cartSubtotal()).total
      : (typedItemsTotal() !== null ? breakdown(typedItemsTotal()).total : null);
    const payment = (form.querySelector('input[name="payment"]:checked') || {}).value || "Cash on Delivery";
    const eta = new Date(Date.now() + 40 * 60000)
      .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const orderId = "FD-" + Date.now().toString(36).toUpperCase().slice(-6);
    successText.textContent =
      `Thanks ${$("#fName").value.trim()}! Your order (${fItems.value.trim()})` +
      (total !== null ? ` totalling ${inr(total)}` : "") +
      ` will be delivered to ${$("#fAddress").value.trim()} by ${eta}. ` +
      `Payment: ${payment}. Order ID: ${orderId}.`;
    success.hidden = false;
    cart.clear();
    promoApplied = false;
    try { localStorage.setItem("foodie-promo", ""); } catch (err) {}
    promoInput.value = ""; setPromoMsg("", true);
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
  if (promoApplied) setPromoMsg("FOODIE50 is saved — it applies on orders of ₹299+", true);
})();
