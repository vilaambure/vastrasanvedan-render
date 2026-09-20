const API_BASE_URL = (() => {
  const explicit = typeof window !== "undefined" ? (window.__API_BASE_URL__ || window.__APP_CONFIG__?.apiBaseUrl || "") : "";
  const base = String(explicit || "").trim().replace(/\/+$/, "");
  if (base) return base;
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return String(window.location.origin).replace(/\/+$/, "");
  }
  return "";
})();
const apiUrl = (url) => {
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
};

const state = {
  products: [],
  sections: [],
  categories: [],
  brands: [],
  announcements: [],
  wishlist: new Set(JSON.parse(localStorage.getItem("vs_wishlist") || "[]")),
  bag: JSON.parse(localStorage.getItem("vs_bag") || "[]"),
  customer: null,
  settings: { upiId: "", upiQrImage: "" },
  pages: {},
  selected: null,
  accountNotice: "",
  heroIndex: 0,
  heroTimer: null,
  fabricFrame: null,
  fabricCleanup: null,
};

const $ = (sel) => document.querySelector(sel);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fallback = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect fill="#e7dfd4" width="800" height="1000"/><text x="50%" y="50%" fill="#7b7369" font-size="28" text-anchor="middle" font-family="serif">Vastra Sanvedan</text></svg>');
const productSizes = (product) => Array.isArray(product?.sizes) ? product.sizes.filter(Boolean) : [];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const STATUSES = ["PLACED", "CONFIRMED", "PACKING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

function persist() { localStorage.setItem("vs_wishlist", JSON.stringify([...state.wishlist])); }
function persistBag() { localStorage.setItem("vs_bag", JSON.stringify(state.bag)); }

function addToBag(productId, options = {}) {
  const product = productById(productId);
  if (!product) return;
  const item = {
    productId: String(product._id),
    name: product.name,
    price: Number(product.sellingPrice || 0),
    qty: Number(options.qty || 1),
    size: options.size || productSizes(product)[0] || "",
    color: options.color || product.colors?.[0] || "Signature",
    image: (product.images || [])[0] || "",
  };
  const existing = state.bag.findIndex((entry) => entry.productId === item.productId && entry.size === item.size && entry.color === item.color);
  if (existing >= 0) state.bag[existing].qty += item.qty;
  else state.bag.push(item);
  persistBag();
  if (document.getElementById("bagCount")) document.getElementById("bagCount").textContent = String(state.bag.reduce((sum, entry) => sum + Number(entry.qty || 0), 0));
  alert(`${product.name} added to bag.`);
}

function applyStoreSettings() {
  const settings = state.settings || {};
  const storeName = settings.storeName || "Vastra Sanvedan";
  const tagline = settings.tagline || "Clothes with a point of view.";
  const primaryColor = settings.primaryColor || "#1c1814";
  const accentColor = settings.accentColor || "#d9c3a0";
  const backgroundColor = settings.backgroundColor || "#f4efe8";
  const surfaceColor = settings.surfaceColor || "#fbf8f3";
  const textColor = settings.textColor || primaryColor;
  const headingColor = settings.headingColor || "#faf8f5";
  const bodyColor = settings.bodyColor || "#fffdf9";
  const brandColor = settings.brandColor || accentColor;
  const buttonColor = settings.buttonColor || accentColor;
  const buttonTextColor = settings.buttonTextColor || primaryColor;
  const mutedColor = settings.mutedColor || "#7b7369";
  const keywordColor = settings.keywordColor || "#4d6a58";
  const fontFamily = settings.fontFamily || "Outfit";
  const announcementText = settings.announcementText || "Vastra Sanvedan — one collection, online and in-store";
  const footerText = settings.footerText || "A considered wardrobe. One inventory. Online and in-store.";
  document.documentElement.style.setProperty("--paper", backgroundColor);
  document.documentElement.style.setProperty("--ivory", surfaceColor);
  document.documentElement.style.setProperty("--surface-color", surfaceColor);
  document.documentElement.style.setProperty("--ink", textColor);
  document.documentElement.style.setProperty("--heading-color", headingColor);
  document.documentElement.style.setProperty("--body-color", bodyColor);
  document.documentElement.style.setProperty("--brand-color", brandColor);
  document.documentElement.style.setProperty("--button-color", buttonColor);
  document.documentElement.style.setProperty("--button-text-color", buttonTextColor);
  document.documentElement.style.setProperty("--muted", mutedColor);
  document.documentElement.style.setProperty("--cognac", accentColor);
  document.documentElement.style.setProperty("--sage", keywordColor);
  document.documentElement.style.setProperty("--font-body", `"${fontFamily}", sans-serif`);
  document.documentElement.style.setProperty("--font-display", `"${fontFamily}", sans-serif`);
  document.title = `${storeName} | Store`;
  const promo = document.getElementById("promo");
  if (promo) promo.textContent = announcementText;
  const brandName = document.getElementById("brandName");
  if (brandName) brandName.textContent = storeName;
  const brandTag = document.getElementById("brandTag");
  if (brandTag) brandTag.textContent = tagline;
  const footerBrand = document.getElementById("footerBrand");
  if (footerBrand) footerBrand.textContent = storeName;
  const footerTextEl = document.getElementById("footerText");
  if (footerTextEl) footerTextEl.textContent = footerText;
}

function img(src) {
  if (!src) return fallback;
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  const normalized = src.startsWith("/") ? src : `/${src}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}
function productById(id) { return state.products.find((p) => p._id === id); }
function path() { return location.pathname.replace(/\/$/, "") || "/"; }

function whatsappNumber(raw = "") {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return digits.replace(/^0+/, "");
  return digits;
}

function buildWhatsAppUrl(items = [], total = 0, customer = {}) {
  const phone = whatsappNumber(state.settings?.contactPhone || "+91 99999 99999");
  if (!phone) return "";
  const productLines = items.map((item) => `${item.name}${item.size ? ` • ${item.size}` : ""} • ${item.color || "Signature"} • ${item.qty} × ${money(item.price || 0)}`).join("\n");
  const customerInfo = customer.name || customer.phone || customer.address ? `\nCustomer: ${customer.name || ""}${customer.phone ? `\nPhone: ${customer.phone}` : ""}${customer.address ? `\nAddress: ${customer.address}${customer.city ? `, ${customer.city}` : ""}${customer.pincode ? `, ${customer.pincode}` : ""}` : ""}` : "";
  const template = state.settings?.whatsappMessage || "Hello Vastra Sanvedan,\nI want to order:\n{productLines}\n\nTotal: {total}{customerInfo}\n\nPlease confirm availability and delivery details.";
  const messageText = template
    .replace("{productLines}", productLines)
    .replace("{total}", money(total))
    .replace("{customerInfo}", customerInfo);
  const message = encodeURIComponent(messageText);
  return `https://wa.me/${phone}?text=${message}`;
}

function openWhatsAppOrder(items = state.bag, total = state.bag.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0), customer = {}) {
  const url = buildWhatsAppUrl(items, total, customer);
  if (!url) {
    alert("WhatsApp business number is not configured in store settings.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

async function api(url, options = {}) {
  const res = await fetch(apiUrl(url), { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function closeOverlays() {
  ["menu", "searchOverlay", "drawer", "modal"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

function openOverlay(id) {
  closeOverlays();
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function productCard(p) {
  const available = Number(p.stock || 0) > 0;
  return `<article class="product">
    <div class="product-media">
      <span class="badge">${p.newArrival ? "New" : esc(p.category || "Edit")}</span>
      <button class="heart" data-wish="${p._id}" aria-label="Favourite">${state.wishlist.has(p._id) ? "♥" : "♡"}</button>
      <a href="/product/${p._id}"><img loading="lazy" src="${esc(img((p.images || [])[0]))}" alt="${esc(p.name)}" onerror="this.src='${fallback}'"></a>
    </div>
    <div class="product-info">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.brand || p.description || "From the live atelier catalogue.")}</p>
      <div class="prices"><strong>${money(p.sellingPrice)}</strong><del>${money(p.mrp)}</del><span class="off">${p.discount || 0}% off</span></div>
      <div class="stacked-actions">
        <button class="view" data-quick="${p._id}" ${available ? "" : "disabled"}>${available ? "Quick view" : "Out of stock"}</button>
        <button class="ghost" data-bag-add="${p._id}" ${available ? "" : "disabled"}>Add to bag</button>
      </div>
    </div>
  </article>`;
}

function bindCards(root = document) {
  root.querySelectorAll("[data-wish]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const id = btn.dataset.wish;
      state.wishlist.has(id) ? state.wishlist.delete(id) : state.wishlist.add(id);
      persist();
      if (state.customer) {
        try { await api("/api/customer/me", { method: "PUT", body: JSON.stringify({ wishlist: [...state.wishlist] }) }); } catch (_e) {}
      }
      renderRoute();
    };
  });
  root.querySelectorAll("[data-quick]").forEach((btn) => { btn.onclick = () => openQuick(btn.dataset.quick); });
  root.querySelectorAll("[data-bag-add]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const product = productById(btn.dataset.bagAdd);
      if (!product) return;
      addToBag(product._id, { size: productSizes(product)[0] || "", color: product.colors?.[0] || "Signature", qty: 1 });
    };
  });
}

function openQuick(id) {
  const p = productById(id);
  if (!p) return;
  const sizes = productSizes(p);
  state.selected = { product: p, size: sizes[0] || "", color: p.colors?.[0] || "Signature" };
  $("#modalBox").innerHTML = `<div class="modal-head"><h2>${esc(p.name)}</h2><button class="icon-btn close-x" data-close-modal aria-label="Close">×</button></div>
    <p>${esc(p.description || "")}</p>
    <div class="prices"><strong>${money(p.sellingPrice)}</strong><del>${money(p.mrp)}</del></div>
    <p>${Number(p.stock) > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
    ${sizes.length ? `<label class="field">Size<div class="swatches" id="qSizes">${sizes.map((s) => `<button type="button" class="${s === state.selected.size ? "active" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div></label>` : ""}
    <label class="field">Colour<div class="swatches" id="qColors">${(p.colors || ["Signature"]).map((c) => `<button type="button" class="${c === state.selected.color ? "active" : ""}" data-color="${esc(c)}">${esc(c)}</button>`).join("")}</div></label>
    <button class="primary" id="quickWhatsApp">Order on WhatsApp</button>
    <a class="ghost" style="display:block;text-align:center" href="/product/${p._id}">View full details</a>`;
  openOverlay("modal");
  const modalBox = $("#modalBox");
  modalBox.querySelector("[data-close-modal]").onclick = closeOverlays;
  modalBox.querySelectorAll("[data-size]").forEach((b) => b.onclick = () => { state.selected.size = b.dataset.size; openQuick(id); });
  modalBox.querySelectorAll("[data-color]").forEach((b) => b.onclick = () => { state.selected.color = b.dataset.color; openQuick(id); });
  modalBox.querySelector("#quickWhatsApp")?.addEventListener("click", () => {
    const item = {
      productId: p._id,
      name: p.name,
      qty: 1,
      price: p.sellingPrice,
      size: state.selected.size || sizes[0] || "",
      color: state.selected.color || p.colors?.[0] || "Signature",
    };
    openWhatsAppOrder([item], item.price);
  });
}

function heroes() {
  return state.sections.filter((s) => ["HERO", "HERO_CAMPAIGN"].includes(s.type));
}

function productsForSection(section) {
  if (section.products?.length) return section.products;
  if (section.type === "NEW_ARRIVALS") return state.products.filter((p) => p.newArrival).slice(0, 12);
  if (section.type === "TRENDING") return state.products.filter((p) => p.trending).slice(0, 12);
  if (section.type === "FEATURED") return state.products.filter((p) => p.featured).slice(0, 12);
  if (section.type === "LOWEST_PRICE") return [...state.products].sort((a, b) => a.sellingPrice - b.sellingPrice).slice(0, 12);
  return state.products.slice(0, 12);
}

function renderHero() {
  const slides = heroes();
  if (!slides.length) {
    return `<section class="hero"><canvas class="fabric-canvas" aria-hidden="true"></canvas><div class="hero-slide active" style="background-image:linear-gradient(#1c1814aa,#1c181466),url('${fallback}')">
      <div class="hero-copy"><span class="eyebrow">Vastra Sanvedan</span><h1>Clothes with a point of view.</h1><p>A considered wardrobe, drawn from the live catalogue.</p><a class="cta" href="/shop">Explore the collection</a></div></div></section>`;
  }
  const i = state.heroIndex % slides.length;
  const slide = slides[i];
  return `<section class="hero" id="hero"><canvas class="fabric-canvas" aria-hidden="true"></canvas>
    ${slides.map((s, idx) => `<div class="hero-slide ${idx === i ? "active" : ""}">
      <picture>
        <source media="(max-width: 700px)" srcset="${esc(s.mobileImage || s.image || fallback)}">
        <img src="${esc(s.image || fallback)}" alt="${esc(s.title)}">
      </picture>
      ${s.videoUrl && idx === i ? `<video autoplay muted loop playsinline poster="${esc(s.posterImage || s.mobileImage || "")}" src="${esc(s.videoUrl)}"></video>` : ""}
      <div class="hero-copy"><span class="eyebrow">${esc(s.subtitle || "Vastra Sanvedan")}</span><h1>${esc(s.title || "The season, considered.")}</h1><p>${esc(s.description || "")}</p>${s.ctaLabel ? `<a class="cta" href="${esc(s.ctaUrl || "/shop")}">${esc(s.ctaLabel)}</a>` : ""}</div>
    </div>`).join("")}
    <div class="hero-nav">${slides.map((_, idx) => `<button class="${idx === i ? "active" : ""}" data-hero="${idx}" aria-label="Slide ${idx + 1}"></button>`).join("")}</div>
  </section>`;
}

function videoBlock(section) {
  return `<section class="wrap"><div class="section-head"><span class="eyebrow">${esc(section.subtitle || "Moving image")}</span><h2>${esc(section.title || "Atelier film")}</h2></div>
    <div class="video-block">
      <video id="houseVideo" playsinline poster="${esc(section.posterImage || section.image || "")}" src="${esc(section.videoUrl)}" onerror="this.closest('.video-block').innerHTML='<p class=empty>Film could not be loaded.</p>'"></video>
      <div class="video-controls">
        <button data-vid="play">Play</button><button data-vid="pause">Pause</button>
        <button data-vid="mute">Mute</button><button data-vid="unmute">Unmute</button>
        <button data-vid="full">Fullscreen</button>
      </div>
    </div></section>`;
}

function renderSection(section) {
  const type = section.type;
  if (["HERO", "HERO_CAMPAIGN"].includes(type)) return "";
  if (["CATEGORIES", "CATEGORY_SHOWCASE"].includes(type)) {
    const cats = state.categories.length ? state.categories : [...new Set(state.products.map((p) => p.category).filter(Boolean))].map((name) => ({ name }));
    return `<section class="wrap"><div class="section-head"><span class="eyebrow">${esc(section.subtitle || "Shop by world")}</span><h2>${esc(section.title || "Categories")}</h2></div>
      <div class="scroller">${cats.map((c) => `<a class="scroller-item" href="/shop?category=${encodeURIComponent(c.name)}" style="background-image:linear-gradient(#1c181488,#1c181466),url('${esc(c.image || "")}')"><h3>${esc(c.name)}</h3></a>`).join("")}</div></section>`;
  }
  if (type === "BRANDS") {
    return `<section class="wrap"><div class="section-head"><span class="eyebrow">${esc(section.subtitle || "Houses we keep")}</span><h2>${esc(section.title || "Brands")}</h2></div>
      <div class="scroller">${(state.brands.length ? state.brands : []).map((b) => `<div class="brand-chip">${b.logo ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}">` : ""}<strong>${esc(b.name)}</strong></div>`).join("") || '<p class="empty">Brands will appear once added in admin.</p>'}</div></section>`;
  }
  if (["FULL_WIDTH_BANNER"].includes(type)) {
    return `<section class="banner" style="background-image:linear-gradient(#1c181466,#1c181488),url('${esc(section.image || "")}')"><div><span class="eyebrow">${esc(section.subtitle)}</span><h2>${esc(section.title)}</h2><p>${esc(section.description)}</p>${section.ctaLabel ? `<a class="cta" href="${esc(section.ctaUrl || "/shop")}">${esc(section.ctaLabel)}</a>` : ""}</div></section>`;
  }
  if (["EDITORIAL", "EDITORIAL_STORY", "SPLIT_STORY", "BRAND_STORY", "COLLECTION"].includes(type)) {
    return `<section class="editorial"><div class="editorial-media" style="background-image:url('${esc(section.image || "")}')"></div><div class="editorial-copy"><span class="eyebrow">${esc(section.subtitle)}</span><h2>${esc(section.title)}</h2><p>${esc(section.description)}</p>${section.ctaLabel ? `<a class="cta" href="${esc(section.ctaUrl || "/shop")}" style="color:var(--ink);border-color:var(--ink)">${esc(section.ctaLabel)}</a>` : ""}</div></section>`;
  }
  if (type === "LOOKBOOK") {
    return `<section class="wrap"><div class="section-head"><h2>${esc(section.title || "Lookbook")}</h2></div>
      <div class="lookbook"><div class="look tall" style="background-image:linear-gradient(#1c181466,#1c181488),url('${esc(section.image || "")}')"><h3>${esc(section.title)}</h3></div>
      <div class="look" style="background-image:linear-gradient(#1c181466,#1c181488),url('${esc(section.mobileImage || section.image || "")}')"><p>${esc(section.description)}</p></div></div></section>`;
  }
  if (["PROMO_STRIP", "PROMOTIONAL_STRIP"].includes(type)) return `<div class="promo-strip">${esc(section.title || section.description)}</div>`;
  if (type === "VIDEO") return videoBlock(section);
  const items = productsForSection(section);
  const grid = ["PRODUCT_GRID", "FEATURED"].includes(type);
  return `<section class="wrap"><div class="section-head"><span class="eyebrow">${esc(section.subtitle || "From the catalogue")}</span><h2>${esc(section.title || type.replaceAll("_", " "))}</h2></div>
    <div class="${grid ? "product-grid" : "rail"}">${items.map(productCard).join("") || '<p class="empty">No products in this edit yet.</p>'}</div></section>`;
}

function homepage() {
  const ordered = [...state.sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const body = ordered.length
    ? renderHero() + ordered.map(renderSection).join("")
    : renderHero() + renderSection({ type: "CATEGORIES", title: "Categories" }) + renderSection({ type: "NEW_ARRIVALS", title: "New arrivals" }) + renderSection({ type: "LOWEST_PRICE", title: "Lowest price" }) + renderSection({ type: "PRODUCT_GRID", title: "The full edit" });
  return body;
}

function shopPage() {
  const params = new URLSearchParams(location.search);
  const group = path().replace("/", "").toUpperCase().replace("-", "_");
  const groupMap = { MEN: "MEN", WOMEN: "WOMEN", KIDS: "KIDS", "HOME-LIVING": "HOME", "HOME_LIVING": "HOME" };
  let list = [...state.products];
  const category = params.get("category");
  const q = (params.get("q") || "").toLowerCase();
  if (category) list = list.filter((p) => p.category === category);
  if (q) list = list.filter((p) => `${p.name} ${p.category} ${p.brand}`.toLowerCase().includes(q));
  if (groupMap[group]) {
    const names = state.categories.filter((c) => c.group === groupMap[group]).map((c) => c.name);
    if (names.length) list = list.filter((p) => names.includes(p.category));
  }
  return `<section class="wrap"><div class="section-head"><span class="eyebrow">Collection</span><h2>${esc(category || groupMap[group] && path().slice(1) || "The shop")}</h2></div>
    <div class="product-grid">${list.map(productCard).join("") || '<p class="empty">Nothing matches this edit yet.</p>'}</div></section>`;
}

function pdp() {
  const id = path().split("/").pop();
  const p = productById(id);
  if (!p) return `<div class="state">This piece could not be found.</div>`;
  const images = (p.images || []).length ? p.images : [fallback];
  return `<section class="wrap pdp">
    <a class="back-to-store" href="/" aria-label="Back to the main page">&larr; Back to main page</a>
    <div class="gallery">
      <img class="main" id="mainImage" src="${esc(img(images[0]))}" alt="${esc(p.name)}">
      <div class="thumbs">${images.map((src, i) => `<img class="${i === 0 ? "active" : ""}" src="${esc(img(src))}" data-main="${esc(img(src))}" alt="">`).join("")}</div>
    </div>
    <div>
      <span class="eyebrow">${esc(p.brand || p.category)}</span>
      <h1 style="font:600 48px/1 Cormorant Garamond,serif">${esc(p.name)}</h1>
      <div class="prices"><strong>${money(p.sellingPrice)}</strong><del>${money(p.mrp)}</del><span class="off">${p.discount || 0}% off</span></div>
      <p>${esc(p.description || "")}</p>
      <p><strong>${Number(p.stock) > 0 ? `${p.stock} available` : "Out of stock"}</strong></p>
      ${productSizes(p).length ? `<label class="field">Size<div class="swatches" id="pSizes">${productSizes(p).map((s, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div></label>` : ""}
      <label class="field">Colour<div class="swatches" id="pColors">${(p.colors || ["Signature"]).map((c, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-color="${esc(c)}">${esc(c)}</button>`).join("")}</div></label>
      <button class="ghost" id="pWhatsApp" ${p.stock < 1 ? "disabled" : ""}>Order on WhatsApp</button>
      <button class="ghost" id="pAddBag" ${p.stock < 1 ? "disabled" : ""}>Add to bag</button>
      <button class="ghost" data-wish="${p._id}">${state.wishlist.has(p._id) ? "Remove from favourites" : "Add to favourites"}</button>
      ${p.details ? `<p><strong>Details</strong><br>${esc(p.details)}</p>` : ""}
      ${p.material ? `<p><strong>Material</strong><br>${esc(p.material)}</p>` : ""}
      ${p.careInstructions ? `<p><strong>Care</strong><br>${esc(p.careInstructions)}</p>` : ""}
      ${p.deliveryInfo ? `<p><strong>Delivery</strong><br>${esc(p.deliveryInfo)}</p>` : ""}
    </div>
  </section>`;
}

function bagPage() {
  const items = state.bag;
  if (!items.length) {
    return `<section class="wrap"><div class="section-head"><span class="eyebrow">Bag</span><h2>Your bag is empty</h2></div><p class="empty">Add a few pieces from the collection to begin.</p><a class="cta" href="/shop">Continue shopping</a></section>`;
  }
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  return `<section class="wrap">
    <div class="section-head"><span class="eyebrow">Bag</span><h2>Your order</h2></div>
    <div class="product-list">${items.map((item, index) => `
      <article class="product" style="padding:16px;display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center;">
        <img src="${esc(img(item.image))}" alt="${esc(item.name)}" style="width:72px;height:96px;object-fit:cover;border-radius:12px;">
        <div>
          <strong>${esc(item.name)}</strong><br>
          <small>${item.size ? `${esc(item.size)} / ` : ""}${esc(item.color || "Signature")}</small><br>
          <strong>${money(item.price)}</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
          <div class="qty" style="display:flex;align-items:center;gap:8px;">
            <button class="ghost" data-bag-action="dec" data-index="${index}">−</button>
            <span>${Number(item.qty || 0)}</span>
            <button class="ghost" data-bag-action="inc" data-index="${index}">+</button>
          </div>
          <button class="ghost" data-bag-action="remove" data-index="${index}">Remove</button>
        </div>
      </article>
    `).join("")}</div>
    <div class="summary-box" style="margin-top:18px;padding:18px;border:1px solid rgba(0,0,0,.08);border-radius:16px;">
      <p><strong>Subtotal</strong> <span style="float:right;">${money(subtotal)}</span></p>
      <a class="cta" href="/checkout" style="display:inline-block;margin-top:10px;">Proceed to checkout</a>
      <button class="primary" id="bagWhatsApp" style="margin-top:10px;">Order on WhatsApp</button>
    </div>
  </section>`;
}

function checkoutPage() {
  const items = state.bag;
  if (!items.length) {
    return `<section class="wrap"><div class="section-head"><span class="eyebrow">Checkout</span><h2>Your bag is empty</h2></div><a class="cta" href="/shop">Continue shopping</a></section>`;
  }
  if (!state.customer) return `<section class="wrap" style="max-width:760px"><div class="section-head"><span class="eyebrow">Checkout</span><h2>Sign in to place your order</h2></div><p class="empty">Your bag is saved. Sign in or create an account to continue with secure stock reservation and order tracking.</p><a class="cta" href="/account">Open account</a></section>`;
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  return `<section class="wrap" style="max-width:760px">
    <div class="section-head"><span class="eyebrow">Checkout</span><h2>Place your order</h2></div>
    <form id="checkoutForm">
      <label class="field">Name<input name="name" required></label>
      <label class="field">Phone<input name="phone" type="tel" placeholder="+91 98765 43210" required></label>
      <label class="field">Address<textarea name="address" rows="3" required></textarea></label>
      <label class="field">City<input name="city" required></label>
      <label class="field">Pincode<input name="pincode" required></label>
      <div class="summary-box" style="margin-top:16px;padding:16px;border:1px solid rgba(0,0,0,.08);border-radius:16px;">
        <p><strong>Items</strong></p>
        ${items.map((item) => `<p>${esc(item.name)} × ${item.qty} — ${money(Number(item.price || 0) * Number(item.qty || 0))}</p>`).join("")}
        <p><strong>Total</strong> <span style="float:right;">${money(subtotal)}</span></p>
      </div>
      <p id="checkoutMessage" class="empty" aria-live="polite"></p>
      <button class="primary" type="submit" style="margin-top:16px;">Place order</button>
      <button class="ghost" type="button" id="checkoutWhatsApp" style="margin-top:10px;">Continue on WhatsApp instead</button>
    </form>
  </section>`;
}

function bindBag() {
  document.querySelectorAll("[data-bag-action]").forEach((button) => {
    button.onclick = () => {
      const index = Number(button.dataset.index);
      const action = button.dataset.bagAction;
      const item = state.bag[index];
      if (!item) return;
      if (action === "inc") item.qty += 1;
      if (action === "dec") item.qty -= 1;
      if (action === "remove") state.bag.splice(index, 1);
      if (item && item.qty <= 0) state.bag.splice(index, 1);
      persistBag();
      renderRoute();
    };
  });
  const bagButton = document.getElementById("bagWhatsApp");
  if (bagButton) {
    const total = state.bag.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    bagButton.onclick = () => openWhatsAppOrder(state.bag, total);
  }
}

function accountForm() {
  return `<section class="wrap" style="max-width:720px">
    <div class="section-head"><span class="eyebrow">Account</span><h2>Account</h2></div>
    ${state.customer ? `<div class="summary-box" style="padding:20px;border:1px solid rgba(0,0,0,.08);border-radius:16px;"><h3>${esc(state.customer.name || "Customer")}</h3><p>${esc(state.customer.email || "")}${state.customer.phone ? ` · ${esc(state.customer.phone)}` : ""}</p><a class="cta" href="/orders">View my orders</a> <button class="ghost" id="logoutBtn" type="button">Sign out</button></div><form id="profileForm" style="margin-top:18px"><label class="field">Name<input name="name" value="${esc(state.customer.name || "")}" required></label><label class="field">Phone<input name="phone" value="${esc(state.customer.phone || "")}" required></label><button class="primary" type="submit">Save profile</button></form>` : `<div class="auth-grid"><form id="loginForm" class="summary-box"><h3>Sign in</h3><label class="field">Email or phone<input name="identifier" autocomplete="username" required></label><label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">Sign in</button></form><form id="registerForm" class="summary-box"><h3>Create account</h3><label class="field">Name<input name="name" required></label><label class="field">Email<input name="email" type="email" autocomplete="email" required></label><label class="field">Phone<input name="phone" type="tel" autocomplete="tel"></label><label class="field">Password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><button class="primary" type="submit">Create account</button></form></div><p id="authMsg" class="empty" aria-live="polite">${esc(state.accountNotice)}</p>`}
  </section>`;
}

function orderTimeline(order) {
  const current = STATUSES.indexOf(order.orderStatus);
  return `<div class="timeline">${STATUSES.map((s, i) => `<div class="tl"><span class="dot ${i <= current ? "done" : ""}"></span><div><strong>${s.replaceAll("_", " ")}</strong><br><small>${(order.statusHistory || []).filter((h) => h.status === s).map((h) => new Date(h.at).toLocaleString("en-IN")).join(" · ")}</small></div></div>`).join("")}</div>`;
}

function ordersBanner() {
  const banners = (state.announcements || []).filter((item) => item.active !== false && item.text).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  if (!banners.length) return "";
  const items = banners.map((item) => item.image
    ? `<span class="orders-banner-image"><img src="${esc(item.image)}" alt="${esc(item.text)}"><b>${esc(item.text)}</b></span>`
    : `<span>${esc(item.text)}</span>`).join("");
  return `<div class="orders-banner"><div class="orders-banner-label">Live updates</div><div class="orders-marquee"><div class="orders-marquee-track">${items}${items}</div></div></div>`;
}

async function ordersPage() {
  if (!state.customer) return `<section class="wrap" style="max-width:720px"><div class="section-head"><span class="eyebrow">Orders</span><h2>Sign in to track orders</h2></div><a class="cta" href="/account">Open account</a></section>`;
  try {
    const data = await api("/api/shop/orders");
    const orders = data.orders || [];
    return `<section class="wrap" style="max-width:760px"><div class="section-head"><span class="eyebrow">Orders</span><h2>My orders</h2></div>${orders.map((order) => `<article class="summary-box" style="margin-bottom:16px;padding:18px;border:1px solid rgba(0,0,0,.08);border-radius:16px;"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>${esc(order.invoiceNumber)}</strong><strong>${money(order.totalAmount)}</strong></div><p>${new Date(order.createdAt).toLocaleString("en-IN")} · ${esc(order.paymentStatus)} · ${esc(order.paymentMode)}</p><p>${(order.items || []).map((item) => `${esc(item.name)} × ${item.qty}`).join(", ")}</p>${orderTimeline(order)}</article>`).join("") || '<p class="empty">No orders yet. Explore the collection to begin.</p>'}</section>`;
  } catch (error) {
    return `<section class="wrap" style="max-width:720px"><div class="section-head"><span class="eyebrow">Orders</span><h2>Orders unavailable</h2></div><p class="empty">${esc(error.message)}</p></section>`;
  }
}

function startOrdersRefresh() {
  clearInterval(state.ordersTimer);
  if (path() !== "/orders" || !state.customer) return;
  state.ordersTimer = setInterval(() => {
    if (document.visibilityState === "visible" && path() === "/orders") renderRoute();
  }, 15000);
}

async function staticPage(slug, fallbackTitle) {
  try {
    const data = await api("/api/shop/pages/" + slug);
    return `<section class="wrap"><h1 style="font:600 48px Cormorant Garamond,serif">${esc(data.page.title)}</h1><div>${esc(data.page.body).replaceAll("\n", "<br>")}</div></section>`;
  } catch (_e) {
    return `<section class="wrap"><h1 style="font:600 48px Cormorant Garamond,serif">${esc(fallbackTitle)}</h1><p class="empty">This page will be published from the admin studio.</p></section>`;
  }
}

function bindHero() {
  const slides = heroes();
  document.querySelectorAll("[data-hero]").forEach((b) => {
    b.onclick = () => { state.heroIndex = Number(b.dataset.hero); renderRoute(); };
  });
  const hero = $("#hero");
  if (hero && slides.length > 1) {
    let startX = 0;
    hero.ontouchstart = (e) => { startX = e.changedTouches[0].clientX; };
    hero.ontouchend = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      state.heroIndex = (state.heroIndex + (dx < 0 ? 1 : slides.length - 1)) % slides.length;
      renderRoute();
    };
    clearInterval(state.heroTimer);
    state.heroTimer = setInterval(() => { state.heroIndex = (state.heroIndex + 1) % slides.length; renderRoute(); }, 7000);
  }
  document.querySelectorAll("[data-vid]").forEach((b) => {
    b.onclick = () => {
      const video = $("#houseVideo");
      if (!video) return;
      if (b.dataset.vid === "play") video.play();
      if (b.dataset.vid === "pause") video.pause();
      if (b.dataset.vid === "mute") video.muted = true;
      if (b.dataset.vid === "unmute") video.muted = false;
      if (b.dataset.vid === "full" && video.requestFullscreen) video.requestFullscreen();
    };
  });
}

function initFabricCanvas() {
  if (state.fabricCleanup) state.fabricCleanup();
  const canvas = document.querySelector(".fabric-canvas");
  if (!canvas || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const pointer = { x: 0.5, y: 0.5 };
  let width = 0;
  let height = 0;
  let start = performance.now();
  const colors = ["#102f36", "#266c67", "#b97855", "#c99d4f", "#f1d9a2"];
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const move = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    pointer.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  };
  const draw = (now) => {
    const time = (now - start) * 0.00042;
    context.clearRect(0, 0, width, height);
    const wash = context.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, "rgba(9, 24, 31, .78)");
    wash.addColorStop(.52, "rgba(22, 67, 69, .28)");
    wash.addColorStop(1, "rgba(8, 18, 24, .84)");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);
    const sway = (pointer.x - .5) * width * .08;
    colors.forEach((color, band) => {
      const offset = band * height * .14 - height * .2;
      const amplitude = height * (.12 + band * .012);
      const phase = time * (1.1 + band * .08) + band * .9;
      context.beginPath();
      for (let x = -width * .12; x <= width * 1.12; x += Math.max(8, width / 70)) {
        const normalized = x / width;
        const y = height * .56 + offset + Math.sin(normalized * 5.8 + phase) * amplitude + Math.sin(normalized * 12 - phase * 1.4) * amplitude * .22 + sway * (normalized - .5);
        if (x === -width * .12) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineTo(width * 1.12, height * 1.2);
      context.lineTo(-width * .12, height * 1.2);
      context.closePath();
      const fabric = context.createLinearGradient(0, 0, width, height);
      fabric.addColorStop(0, color);
      fabric.addColorStop(.48, color + "dd");
      fabric.addColorStop(1, "#08161c");
      context.fillStyle = fabric;
      context.globalAlpha = .72;
      context.fill();
      context.globalAlpha = 1;
    });
    const glint = context.createLinearGradient(width * (.1 + pointer.x * .2), 0, width * (.7 + pointer.x * .2), height);
    glint.addColorStop(0, "rgba(255,255,255,0)");
    glint.addColorStop(.48, "rgba(255,244,201,.2)");
    glint.addColorStop(.55, "rgba(255,255,255,0)");
    context.globalCompositeOperation = "screen";
    context.fillStyle = glint;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    state.fabricFrame = requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointermove", move, { passive: true });
  state.fabricCleanup = () => {
    cancelAnimationFrame(state.fabricFrame);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointermove", move);
  };
  state.fabricFrame = requestAnimationFrame(draw);
}

function bindPdp() {
  const p = productById(path().split("/").pop());
  if (!p) return;
  let size = productSizes(p)[0] || "";
  let color = p.colors?.[0] || "Signature";
  document.querySelectorAll("#pSizes [data-size]").forEach((b) => b.onclick = () => { size = b.dataset.size; document.querySelectorAll("#pSizes button").forEach((x) => x.classList.toggle("active", x === b)); });
  document.querySelectorAll("#pColors [data-color]").forEach((b) => b.onclick = () => { color = b.dataset.color; document.querySelectorAll("#pColors button").forEach((x) => x.classList.toggle("active", x === b)); });
  document.querySelectorAll("[data-main]").forEach((t) => t.onclick = () => { $("#mainImage").src = t.dataset.main; document.querySelectorAll(".thumbs img").forEach((x) => x.classList.toggle("active", x === t)); });
  $("#mainImage")?.addEventListener("click", () => {
    const zoom = document.createElement("div");
    zoom.className = "zoom";
    zoom.innerHTML = `<img src="${esc($("#mainImage").src)}" alt="Zoom">`;
    zoom.onclick = () => zoom.remove();
    document.body.appendChild(zoom);
  });
  $("#pWhatsApp")?.addEventListener("click", () => openWhatsAppOrder([{ productId: p._id, name: p.name, qty: 1, price: p.sellingPrice, size, color }], p.sellingPrice));
  $("#pAddBag")?.addEventListener("click", () => { addToBag(p._id, { size, color, qty: 1 }); });
}

function bindAuth() {
  const msg = $("#authMsg");
  const authResult = new URLSearchParams(location.search).get("auth");
  if (msg && authResult === "google_failed") msg.textContent = "Google sign in could not be completed. Please try again.";
  if (msg && authResult === "blocked") msg.textContent = "This account is blocked. Please contact the store.";
  if (!state.customer && $("#googleSignIn")) {
    fetch(apiUrl("/api/customer/google/status"), { credentials: "include" })
      .then((response) => response.json())
      .then((data) => { $("#googleSignIn").hidden = !data.configured; })
      .catch(() => {});
  }
  if (!document.getElementById("loginForm") && !document.getElementById("registerForm") && !document.getElementById("otpRequestForm") && !document.getElementById("otpVerifyForm")) return;
  $("#otpRequestForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    const sendButton = e.target.querySelector("button[type='submit']");
    if (sendButton) { sendButton.disabled = true; sendButton.textContent = "Sending..."; }
    try {
      const data = await Promise.race([
        api("/api/customer/email-otp/request", { method: "POST", body: JSON.stringify({ email }) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("OTP request timed out. Check SMTP settings.")), 25000)),
      ]);
      $("#authMsg").textContent = data.demo ? `Demo OTP: ${data.demoOtp} — email service configured nahi hai.` : data.message;
      $("#otpVerifyForm").hidden = false;
      $("#otpVerifyForm").dataset.email = email;
      if (data.demo) {
        const otpInput = $("#otpVerifyForm input[name='otp']");
        if (otpInput) { otpInput.value = data.demoOtp; otpInput.focus(); }
      }
    } catch (error) { if (msg) msg.textContent = error.message; }
    finally { if (sendButton) { sendButton.disabled = false; sendButton.textContent = "Send OTP"; } }
  });
  $("#otpVerifyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp = new FormData(e.target).get("otp");
    try {
      const data = await api("/api/customer/email-otp/verify", { method: "POST", body: JSON.stringify({ email: e.target.dataset.email, otp }) });
      state.customer = data.customer;
      state.accountNotice = "Signed in successfully.";
      renderRoute();
    } catch (error) { if (msg) msg.textContent = error.message; }
  });
  $("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(e.target));
      const data = await api("/api/customer/login", { method: "POST", body: JSON.stringify(body) });
      state.customer = data.customer;
      state.accountNotice = "";
      if (data.customer.wishlist) state.wishlist = new Set(data.customer.wishlist.map(String));
      persist();
      renderRoute();
    } catch (error) { if (msg) msg.textContent = error.message; }
  });
  $("#registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = Object.fromEntries(new FormData(e.target));
      const data = await api("/api/customer/register", { method: "POST", body: JSON.stringify(body) });
      state.customer = data.customer;
      state.accountNotice = "";
      renderRoute();
    } catch (error) { if (msg) msg.textContent = error.message; }
  });
  $("#profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    try {
      const data = await api("/api/customer/me", { method: "PUT", body: JSON.stringify({ name: values.name, phone: values.phone, addresses: [{ ...values, isDefault: true }] }) });
      state.customer = data.customer;
      state.accountNotice = "Profile saved.";
      await renderRoute();
    } catch (error) { if (msg) msg.textContent = error.message; }
  });
  $("#logoutBtn")?.addEventListener("click", async () => {
    await api("/api/customer/logout", { method: "POST" });
    state.customer = null;
    state.accountNotice = "";
    renderRoute();
  });
}

async function renderRoute() {
  const route = path();
  applyStoreSettings();
  const promoText = state.announcements[0]?.text || state.settings?.announcementText || "Vastra Sanvedan — one collection, online and in-store";
  const promo = document.getElementById("promo");
  if (promo) promo.textContent = promoText;
  let html = "";
  if (route.startsWith("/product/")) html = pdp();
  else if (route === "/bag") html = bagPage();
  else if (route === "/checkout") html = checkoutPage();
  else if (route === "/account") html = accountForm();
  else if (route === "/orders") html = await ordersPage();
  else if (route === "/contact") html = await staticPage("contact", "Contact us");
  else if (route === "/faqs") html = await staticPage("faqs", "FAQs");
  else if (route === "/legal") html = await staticPage("legal", "Legal");
  else if (route === "/shop" || route === "/men" || route === "/women" || route === "/kids" || route === "/home-living") html = shopPage();
  else html = homepage();
  $("#app").innerHTML = html;
  bindCards();
  bindHero();
  initFabricCanvas();
  bindPdp();
  bindBag();
  bindAuth();
  startOrdersRefresh();
  if (route === "/checkout") {
    document.getElementById("checkoutForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const values = Object.fromEntries(form.entries());
      const submit = e.target.querySelector("button[type='submit']");
      if (submit) { submit.disabled = true; submit.textContent = "Placing order..."; }
      try {
        const data = await api("/api/shop/checkout", { method: "POST", body: JSON.stringify({ items: state.bag, customer: values }) });
        state.bag = [];
        persistBag();
        state.accountNotice = `Order ${data.invoiceNumber} placed successfully.`;
        history.pushState({}, "", "/orders");
        await renderRoute();
      } catch (error) {
        const message = document.getElementById("checkoutMessage");
        if (message) message.textContent = error.message;
      } finally { if (submit) { submit.disabled = false; submit.textContent = "Place order"; } }
    });
    document.getElementById("checkoutWhatsApp")?.addEventListener("click", () => {
      const total = state.bag.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
      openWhatsAppOrder(state.bag, total, Object.fromEntries(new FormData(document.getElementById("checkoutForm"))));
    });
  }
  document.querySelectorAll(".menu-nav a").forEach((a) => { a.onclick = () => { $("#menu").hidden = true; }; });
}

function setupChrome() {
  $("#menuOpen").onclick = () => { $("#menu").hidden = false; };
  const backHome = $("#backHome");
  if (backHome) {
    backHome.hidden = path() === "/";
  }
  $("#menuClose").onclick = () => { $("#menu").hidden = true; };
  $("#menu").onclick = (e) => { if (e.target.id === "menu") $("#menu").hidden = true; };
  $("#searchOpen").onclick = () => { openOverlay("searchOverlay"); $("#searchInput").focus(); };
  $("#searchClose").onclick = closeOverlays;
  const bagCount = document.createElement("span");
  bagCount.id = "bagCount";
  bagCount.textContent = String(state.bag.reduce((sum, item) => sum + Number(item.qty || 0), 0));
  bagCount.style.cssText = "display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 6px;border-radius:999px;background:var(--ink);color:white;font-size:11px;line-height:1;";
  const bagButton = document.createElement("button");
  bagButton.type = "button";
  bagButton.className = "icon-btn";
  bagButton.textContent = "Bag";
  bagButton.setAttribute("aria-label", "Bag");
  bagButton.onclick = () => { location.href = "/bag"; };
  bagButton.appendChild(bagCount);
  const headerRight = document.querySelector(".header-right");
  if (headerRight && !headerRight.querySelector("#bagButton")) {
    bagButton.id = "bagButton";
    headerRight.appendChild(bagButton);
  }
  $("#modal").onclick = (e) => { if (e.target.id === "modal") closeOverlays(); };
  window.addEventListener("scroll", () => $("#header").classList.toggle("scrolled", scrollY > 12));
  $("#filterCategory").innerHTML = `<option value="">All categories</option>` + [...new Set(state.products.map((p) => p.category))].map((c) => `<option>${esc(c)}</option>`).join("");
  const runSearch = () => {
    const q = $("#searchInput").value.toLowerCase();
    const cat = $("#filterCategory").value;
    const min = Number($("#filterMin").value);
    const max = Number($("#filterMax").value);
    const list = state.products.filter((p) => {
      const hay = `${p.name} ${p.category} ${p.brand}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (cat && p.category !== cat) return false;
      if (Number.isFinite(min) && min > 0 && p.sellingPrice < min) return false;
      if (Number.isFinite(max) && max > 0 && p.sellingPrice > max) return false;
      return true;
    });
    $("#searchResults").innerHTML = list.map(productCard).join("") || '<p class="empty">No pieces match.</p>';
    bindCards($("#searchResults"));
  };
  ["searchInput", "filterCategory", "filterMin", "filterMax"].forEach((id) => $(`#${id}`).addEventListener("input", runSearch));
}

function initLiquidMotion() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  let lastShake = 0;
  document.addEventListener("pointermove", (event) => {
    const x = event.clientX / Math.max(window.innerWidth, 1) * 100;
    const y = event.clientY / Math.max(window.innerHeight, 1) * 100;
    document.documentElement.style.setProperty("--liquid-x", `${x}%`);
    document.documentElement.style.setProperty("--liquid-y", `${y}%`);
    const surface = event.target?.closest?.(".product, .summary-box, .order-card, .panel, .brand-chip, .scroller-item");
    if (surface) {
      surface.style.setProperty("--liquid-rx", `${((50 - y) * .035).toFixed(2)}deg`);
      surface.style.setProperty("--liquid-ry", `${((x - 50) * .035).toFixed(2)}deg`);
      surface.style.setProperty("--liquid-card-x", `${x}%`);
      surface.style.setProperty("--liquid-card-y", `${y}%`);
    }
  }, { passive: true });
  document.addEventListener("pointerdown", () => document.body.classList.add("liquid-touch"), { passive: true });
  document.addEventListener("pointerup", () => document.body.classList.remove("liquid-touch"), { passive: true });
  const triggerShake = () => {
    if (Date.now() - lastShake < 900) return;
    lastShake = Date.now(); document.body.classList.remove("liquid-shake"); void document.body.offsetWidth; document.body.classList.add("liquid-shake"); window.setTimeout(() => document.body.classList.remove("liquid-shake"), 760);
  };
  window.addEventListener("devicemotion", (event) => { const a = event.accelerationIncludingGravity || event.acceleration; if (a && Math.hypot(a.x || 0, a.y || 0, a.z || 0) > 19) triggerShake(); }, { passive: true });
  document.addEventListener("pointerdown", () => { if (typeof DeviceMotionEvent?.requestPermission === "function") DeviceMotionEvent.requestPermission().catch(() => {}); }, { once: true, passive: true });
}

async function boot() {
  try {
    const [home, catalog, settings, me] = await Promise.all([
      api("/api/content/homepage"),
      api("/api/shop/catalog"),
      api("/api/shop/settings"),
      fetch(apiUrl("/api/customer/me"), { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]);
    state.sections = home.sections || [];
    state.announcements = home.announcements || [];
    state.products = home.products?.length ? home.products : (await api("/api/shop/products")).products || [];
    state.categories = catalog.categories || home.categories || [];
    state.brands = catalog.brands || home.brands || [];
    state.settings = settings.settings || state.settings;
    applyStoreSettings();
    if (me.customer) {
      state.customer = me.customer;
      if (me.customer.wishlist?.length) state.wishlist = new Set(me.customer.wishlist.map(String));
    }
  } catch (_e) {
    $("#app").innerHTML = `<div class="state">The collection is temporarily unavailable.</div>`;
    setupChrome();
    return;
  }
  setupChrome();
  initLiquidMotion();
  await renderRoute();
}

window.addEventListener("popstate", () => renderRoute());
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href^='/']");
  if (!link || link.target === "_blank" || e.metaKey || e.ctrlKey) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin) return;
  if (["/admin", "/admin/pos"].includes(url.pathname)) return;
  e.preventDefault();
  history.pushState({}, "", url.pathname + url.search);
  closeOverlays();
  renderRoute();
});

boot();
