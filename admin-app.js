const $ = (s) => document.querySelector(s);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (ch) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[ch]));
const SECTION_TYPES = ["HERO", "CATEGORIES", "BRANDS", "LOWEST_PRICE", "PRODUCT_CAROUSEL", "PRODUCT_GRID", "FULL_WIDTH_BANNER", "VIDEO", "COLLECTION", "LOOKBOOK", "EDITORIAL", "PROMO_STRIP", "NEW_ARRIVALS", "TRENDING", "FEATURED"];
const GROUPS = ["MEN", "WOMEN", "KIDS", "HOME", "OTHER"];
const STATUSES = ["PLACED", "CONFIRMED", "PACKING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
let cache = { products: [], categories: [], brands: [], sections: [], announcements: [], orders: [], customers: [], analytics: null, settings: null, pages: [] };
let tab = "dashboard";

async function api(path, options = {}) {
  const isRaw = options.raw;
  const res = await fetch("/api/admin" + path, { credentials: "same-origin", ...options, headers: isRaw ? options.headers : { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function notice(text) { $("#notice").textContent = text || ""; }
function showLogin(_text = "") { const shell = $("#shell"); if (shell) shell.hidden = false; }
function field(name, label, extra = "") { return `<label class="field">${label}<input name="${name}" ${extra}></label>`; }
const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];

async function fileUrl(inputOrFile, fallback = "") {
  const file = inputOrFile instanceof File ? inputOrFile : inputOrFile?.files?.[0];
  if (!file) return fallback;
  const res = await fetch("/api/admin/media", { method: "POST", credentials: "same-origin", headers: { "Content-Type": file.type }, body: file });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.url;
}

function attachDirectUpload(fileInput, targetSelector, { append = false } = {}) {
  if (!fileInput || !targetSelector) return;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const uploadedUrl = await fileUrl(file, "");
      if (!uploadedUrl) throw new Error("Upload did not return a URL.");
      const target = document.querySelector(targetSelector);
      if (!target) throw new Error("Upload target input not found.");
      if (append && target.value.trim()) {
        const list = new Set(String(target.value).split(",").map((v) => v.trim()).filter(Boolean));
        list.add(uploadedUrl);
        target.value = [...list].join(", ");
      } else {
        target.value = uploadedUrl;
      }
      notice(`${file.name} uploaded successfully.`);
    } catch (error) {
      notice(error.message);
    }
  });
}

function bindDirectUploads() {
  const genericMap = {
    categoriesFile: "input[name='image']",
    brandsFile: "input[name='logo']",
    imageFile: "input[name='image']",
    mobileFile: "input[name='mobileImage']",
    videoFile: "input[name='videoUrl']",
    posterFile: "input[name='posterImage']",
    productImages: "input[name='images']",
    brandLogoFile: "input[name='brandLogo']",
    announcementImage: "input[name='image']",
  };
  Object.entries(genericMap).forEach(([id, selector]) => {
    const input = document.getElementById(id);
    if (input) attachDirectUpload(input, selector, { append: id === "productImages" });
  });
}

function dataUrlFallback(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (file.size > 2 * 1024 * 1024) return reject(new Error("Image must be 2 MB or smaller for inline save."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function loadAll() {
  const [analytics, products, orders, content, categories, brands, customers, settings, pages] = await Promise.all([
    api("/sales-analytics?from=2000-01-01"),
    api("/products"),
    api("/orders"),
    api("/content"),
    api("/categories"),
    api("/brands"),
    api("/customers"),
    api("/settings"),
    api("/pages"),
  ]);
  cache = {
    analytics,
    products: products.products,
    orders: orders.orders,
    sections: content.sections,
    announcements: content.announcements || [],
    categories: categories.categories,
    brands: brands.brands,
    customers: customers.customers,
    settings: settings.settings,
    pages: pages.pages,
  };
}

function bars(rows, valueKey = "revenue", labelKey = "_id") {
  const max = Math.max(...rows.map((r) => r[valueKey] || 0), 1);
  return rows.length ? `<div class="bars">${rows.map((r) => `<div class="bar" style="height:${Math.max(4, (r[valueKey] || 0) / max * 100)}%"><label>${r[labelKey] || "—"}</label></div>`).join("")}</div>` : '<p class="notice">No data yet.</p>';
}

function dashboard() {
  const a = cache.analytics || { summary: {}, byType: [], byPayment: [], productSales: [], categorySales: [], daily: [] };
  const s = a.summary || {};
  const lowStockCount = (cache.products || []).filter((p) => Number(p.stock || 0) < 5).length;
  return `<div class="dashboard-shell">
    <div class="dashboard-hero panel">
      <div>
        <p class="eyebrow">Store overview</p>
        <h2>Vastra Sanvedan at a glance</h2>
        <p class="subtle">Track sales, react to stock pressure, and move faster between the most important operations.</p>
      </div>
      <div class="quick-actions">
        <a class="action-btn alt" href="/admin/pos">Billing POS</a>
        <button class="action-btn" data-quick-tab="products">New product</button>
        <button class="action-btn" data-quick-tab="studio">Add section</button>
        <button class="action-btn" data-quick-tab="orders">Manage orders</button>
        <a class="action-btn alt" href="/" target="_blank" rel="noreferrer">View store</a>
      </div>
    </div>
    <div class="metrics">
      <div class="metric"><span>Today's revenue</span><b>${money(s.todayRevenue)}</b></div>
      <div class="metric"><span>Range revenue</span><b>${money(s.turnover)}</b></div>
      <div class="metric"><span>Monthly revenue</span><b>${money(s.monthlyRevenue)}</b></div>
      <div class="metric"><span>Orders</span><b>${s.orders || 0}</b></div>
      <div class="metric"><span>Average order</span><b>${money(s.averageOrderValue)}</b></div>
      <div class="metric"><span>Units sold</span><b>${s.units || 0}</b></div>
      <div class="metric"><span>Products</span><b>${s.productCount || 0}</b></div>
      <div class="metric"><span>Customers</span><b>${s.customerCount || 0}</b></div>
      <div class="metric highlight"><span>Low stock</span><b>${lowStockCount}</b></div>
    </div>
    <div class="dashboard-grid">
      <div class="panel"><h2>Revenue over time</h2>${bars(a.daily || [], "revenue", "_id")}</div>
      <div class="panel"><h2>Online vs offline</h2>${bars(a.byType || [])}</div>
      <div class="panel"><h2>CASH vs UPI vs CARD</h2>${bars(a.byPayment || [])}</div>
      <div class="panel"><h2>Top products</h2>${bars((a.productSales || []).map((p) => ({ _id: p.name, revenue: p.revenue })))}</div>
      <div class="panel"><h2>Top categories</h2>${bars((a.categorySales || []).map((c) => ({ _id: c._id || "Uncategorised", revenue: c.revenue })))}</div>
      <div class="panel"><h2>Store notes</h2>
        <ul class="check-list">
          <li>${lowStockCount ? `${lowStockCount} products need stock attention.` : "Stock is looking healthy."}</li>
          <li>${(cache.orders || []).length ? `${(cache.orders || []).length} orders waiting in the queue.` : "No pending orders."}</li>
          <li>${(cache.sections || []).length ? `${(cache.sections || []).length} homepage sections active.` : "No homepage sections yet."}</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function studio() {
  const list = cache.sections || [];
  return `<div class="panel"><h2>Homepage studio</h2>
    <form class="form" id="sectionForm">
      <input type="hidden" name="id">
      <label class="field">Type<select name="type">${SECTION_TYPES.map((t) => `<option>${t}</option>`).join("")}</select></label>
      ${field("displayOrder", "Order", 'type="number" value="0"')}
      ${field("title", "Title")}${field("subtitle", "Subtitle")}
      <label class="field full">Description<textarea name="description"></textarea></label>
      ${field("ctaLabel", "CTA label")}${field("ctaUrl", "CTA destination")}
      <label class="field">Desktop image<input name="image"><input id="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="field">Mobile image<input name="mobileImage"><input id="mobileFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="field">Video URL / upload<input name="videoUrl"><input id="videoFile" type="file" accept="video/mp4"></label>
      <label class="field">Poster<input name="posterImage"><input id="posterFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="field full">Product IDs (comma)<input name="products" placeholder="from catalogue below"></label>
      <label class="field full"><input name="active" type="checkbox" checked> Active</label>
      <button class="primary" type="submit">Save section</button>
    </form></div>
    <div class="panel"><h2>Live sections</h2>
      ${(list.map((s, i) => `<div class="panel"><strong>${s.displayOrder}. ${s.title || s.type}</strong> · ${s.active ? "On" : "Off"}
        <div class="row-actions">
          <button class="ghost" data-edit="${s._id}">Edit</button>
          <button class="ghost" data-toggle="${s._id}">${s.active ? "Deactivate" : "Activate"}</button>
          <button class="ghost" data-move="${s._id}" data-dir="up" ${i === 0 ? "disabled" : ""}>Up</button>
          <button class="ghost" data-move="${s._id}" data-dir="down" ${i === list.length - 1 ? "disabled" : ""}>Down</button>
          <button class="danger" data-del="${s._id}">Delete</button>
        </div>
        ${s.image || s.mobileImage || s.videoUrl ? `<div class="preview">${s.image ? `<img src="${s.image}" alt="desktop">` : ""}${s.mobileImage ? `<img src="${s.mobileImage}" alt="mobile">` : ""}${s.videoUrl ? `<video src="${s.videoUrl}" controls></video>` : ""}</div>` : ""}
      </div>`).join("") || '<p>No sections yet.</p>')}</div>`;
}

function catalogForm(kind) {
  const items = cache[kind] || [];
  const isBrand = kind === "brands";
  return `<div class="panel"><h2>${isBrand ? "Brands" : "Categories"}</h2>
    <form class="form" id="${kind}Form">
      <input type="hidden" name="id">
      ${field("name", "Name", "required")}
      ${isBrand ? "" : `<label class="field">Group<select name="group">${GROUPS.map((g) => `<option>${g}</option>`).join("")}</select></label>`}
      ${field("displayOrder", "Order", 'type="number" value="0"')}
      <label class="field">${isBrand ? "Logo" : "Image"}<input name="${isBrand ? "logo" : "image"}"><input id="${kind}File" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="field"><input name="active" type="checkbox" checked> Active</label>
      <button class="primary">Save</button>
    </form></div>
    <div class="panel"><table class="table"><thead><tr><th>Name</th><th>Order</th><th>Status</th><th></th></tr></thead><tbody>
      ${items.map((item) => `<tr><td>${item.name}</td><td>${item.displayOrder}</td><td>${item.active ? "Active" : "Off"}</td><td><button class="ghost" data-edit-${kind}="${item._id}">Edit</button> <button class="danger" data-del-${kind}="${item._id}">Delete</button></td></tr>`).join("")}
    </tbody></table></div>`;
}

function productsView() {
  const formatBarcode = (value) => {
    const text = String(value ?? "").trim();
    return text || "Not assigned";
  };
  return `<div class="panel"><h2>Products</h2>
    <form class="form" id="productForm">
      <input type="hidden" name="id">
      ${field("name", "Name", "required")}${field("category", "Category", "required")}
      ${field("brand", "Brand")}${field("barcode", "Barcode")}
      ${field("mrp", "MRP", 'type="number" min="0" required')}${field("sellingPrice", "Selling price", 'type="number" min="0" required')}
      ${field("stock", "Stock", 'type="number" min="0" required')}
      <label class="field full">Sizes
        <input name="sizes" id="productSizes" placeholder="Choose below or type custom sizes, separated by commas">
        <div class="size-presets" role="group" aria-label="Common sizes">
          ${COMMON_SIZES.map((size) => `<button type="button" class="ghost" data-size-preset="${size}">${size}</button>`).join("")}
        </div>
        <label class="check-row"><input type="checkbox" id="productNoSize"> This product has no size (for example saree, dupatta, decor)</label>
        <small class="subtle">Leave empty or select “no size” when size does not apply.</small>
      </label>
      ${field("colors", "Colours")}
      <label class="field full">Description<textarea name="description"></textarea></label>
      <label class="field full">Details<textarea name="details"></textarea></label>
      ${field("material", "Material")}${field("careInstructions", "Care")}
      <label class="field full">Delivery information<input name="deliveryInfo"></label>
      <label class="field full">Image URLs<input name="images"><input id="productImages" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
      <label class="field full"><input name="active" type="checkbox" checked> Active <input name="newArrival" type="checkbox"> New <input name="featured" type="checkbox"> Featured <input name="trending" type="checkbox"> Trending</label>
      <button class="primary">Save product</button>
    </form></div>
    <div class="panel"><table class="table"><thead><tr><th>Name</th><th>Product ID</th><th>Barcode</th><th>Price</th><th>Stock</th><th>Flags</th><th></th></tr></thead><tbody>
      ${cache.products.map((p) => `<tr><td>${p.name}</td><td><code>${p._id}</code><button class="ghost" type="button" data-copy-product-id="${p._id}">Copy ID</button></td><td>${formatBarcode(p.barcode)}</td><td>${money(p.sellingPrice)}</td><td>${p.stock}</td><td>${p.active ? "Active" : "Inactive"} ${p.newArrival ? "New" : ""} ${p.featured ? "Feat" : ""} ${p.trending ? "Trend" : ""}</td>
        <td><button class="ghost" data-edit-product="${p._id}">Edit</button> <button class="ghost" data-active-product="${p._id}">${p.active ? "Deactivate" : "Activate"}</button> <button class="danger" data-del-product="${p._id}">Delete</button></td></tr>`).join("")}
    </tbody></table></div>`;
}

function barcodeStudio() {
  const products = cache.products || [];
  const productOptions = products.map((product) => `<option value="${product._id}">${escapeHtml(product.name)} · ${escapeHtml(product.category || "General")} · ${escapeHtml(product.barcode || "No barcode")}</option>`).join("");
  return `<div class="panel barcode-studio" id="barcodeStudioPanel">
    <div class="studio-heading">
      <div>
        <p class="eyebrow">Catalog identity</p>
        <h2>Barcode Studio</h2>
        <p class="subtle">Create, preview and print product barcodes</p>
      </div>
      <span class="status-badge">Code 128 ready</span>
    </div>

    <div class="barcode-layout">
      <form class="form barcode-controls" id="barcodeStudioForm">
        <div class="barcode-generator-head">
          <h3>Barcode Generator</h3>
        </div>

        <div class="barcode-row">
          <label class="field full">
            Product
            <select name="productId" id="barcodeProductSelect" required>
              <option value="">Select a product</option>
              ${productOptions}
            </select>
          </label>
        </div>

        <div class="barcode-row barcode-row-tight">
          <label class="field">
            Barcode Type
            <select name="format" id="barcodeTypeSelect">
              <option value="CODE128">Code 128</option>
              <option value="EAN13">EAN-13</option>
              <option value="UPCA">UPC-A</option>
            </select>
          </label>

          <label class="field">
            Label Size
            <select name="labelSize" id="barcodeLabelSize">
              <option value="small">Small</option>
              <option value="medium" selected>Medium</option>
              <option value="large">Large</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <div class="field quantity-field">
            <label for="barcodeQuantityInput">Quantity</label>
            <div class="quantity-control">
              <button type="button" id="barcodeQtyMinus" aria-label="Decrease quantity">−</button>
              <input id="barcodeQuantityInput" name="quantity" type="number" min="1" max="24" value="1" inputmode="numeric">
              <button type="button" id="barcodeQtyPlus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>

        <div class="barcode-row">
          <label class="field full">
            Barcode Value
            <input id="barcodeValueInput" name="barcodeValue" placeholder="Enter a valid barcode value" autocomplete="off">
          </label>
        </div>

        <div class="barcode-row barcode-row-tight custom-size-row" id="barcodeCustomSizeRow" hidden>
          <label class="field">
            Width (mm)
            <input id="barcodeCustomWidth" name="customWidth" type="number" min="60" max="220" value="80" inputmode="decimal">
          </label>
          <label class="field">
            Height (mm)
            <input id="barcodeCustomHeight" name="customHeight" type="number" min="30" max="140" value="50" inputmode="decimal">
          </label>
        </div>

        <div class="barcode-checklist">
          <label><input type="checkbox" name="showName" checked> Product Name</label>
          <label><input type="checkbox" name="showSku" checked> SKU</label>
          <label><input type="checkbox" name="showPrice" checked> Price</label>
          <label><input type="checkbox" name="showCategory"> Category</label>
          <label><input type="checkbox" name="showShop"> Shop Name</label>
        </div>

        <div class="barcode-actions full">
          <button class="primary" type="button" id="generateBarcodeBtn">Generate Barcode</button>
          <button class="ghost" type="button" id="resetBarcodeBtn">Reset</button>
        </div>

        <div id="barcodeStudioMessage" class="barcode-message" aria-live="polite"></div>
      </form>

      <div class="barcode-preview-card">
        <div class="preview-label">
          <strong id="barcodePreviewName">Select a product</strong>
          <span id="barcodePreviewMeta">Ready for barcode generation</span>
        </div>

        <div class="barcode-preview-shell" id="barcodePreviewShell">
          <svg id="barcodePreviewSvg" role="img" aria-label="Barcode preview"></svg>
        </div>

        <div class="preview-code" id="barcodePreviewValue">No barcode generated</div>
        <div class="preview-meta-row">
          <span id="barcodePreviewSku">SKU: —</span>
          <span id="barcodePreviewPrice">Price: —</span>
        </div>

        <div class="barcode-actions">
          <button class="ghost" type="button" id="downloadSvgBtn">Download SVG</button>
          <button class="ghost" type="button" id="downloadPngBtn">Download PNG</button>
          <button class="primary" type="button" id="printBarcodeBtn">Print Labels</button>
        </div>
      </div>
    </div>

    <div class="barcode-label-grid" id="barcodeLabelGrid"></div>
  </div>`;
}

function inventoryView() {
  const formatBarcode = (value) => {
    const text = String(value ?? "").trim();
    return text || "Not assigned";
  };
  return `<div class="panel"><h2>Shared inventory</h2>
    <p>Online store and POS use the same stock field. Sales decrement atomically.</p>
    <table class="table"><thead><tr><th>Product</th><th>Barcode</th><th>Stock</th><th>Status</th></tr></thead><tbody>
      ${cache.products.map((p) => `<tr><td>${p.name}</td><td>${formatBarcode(p.barcode)}</td><td>${p.stock}</td><td>${p.stock < 1 ? "Out" : p.stock < 5 ? "Low" : "OK"}</td></tr>`).join("")}
    </tbody></table></div>`;
}

function ordersView() {
  return `<div class="panel"><h2>Orders</h2>
    ${cache.orders.map((o) => `<div class="panel">
      <strong>${o.invoiceNumber}</strong> · ${o.orderType} · ${money(o.totalAmount)} · ${o.paymentMode} · ${o.paymentStatus} · ${o.orderStatus}
      <small style="display:block">${o.customer?.name || ""} · ${o.customer?.phone || ""} · ${new Date(o.createdAt).toLocaleString("en-IN")}</small>
      <p>${(o.items || []).map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
      <form class="form status-form" data-order="${o._id}">
        <label class="field">Status<select name="status">${STATUSES.map((s) => `<option ${s === o.orderStatus ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <button class="primary">Update status</button>
      </form>
    </div>`).join("") || "<p>No orders yet.</p>"}</div>`;
}

function paymentsView() {
  return `<div class="panel"><h2>Payments</h2>
    ${cache.orders.map((o) => `<div class="panel">
      <strong>${o.invoiceNumber}</strong> · expected ${money(o.payment?.expectedAmount || o.totalAmount)} · received ${o.payment?.receivedAmount == null ? "—" : money(o.payment.receivedAmount)} · ${o.paymentStatus}
      <p>${o.customer?.name || ""} · ${o.paymentMode} · ref ${o.payment?.reference || "—"}</p>
      <form class="form pay-form" data-order="${o._id}">
        ${field("receivedAmount", "Received amount", 'type="number" step="0.01" required')}
        ${field("reference", "Payment reference")}
        <button class="primary">Verify amount</button>
      </form>
      <button class="danger" data-fail="${o._id}">Mark failed</button>
    </div>`).join("") || "<p>No payments yet.</p>"}</div>`;
}

function customersView() {
  return `<div class="panel"><h2>Customers</h2>
    ${cache.customers.map((c) => `<div class="panel">
      <strong>${c.name}</strong> · ${c.email} · ${c.phone || ""} · ${c.blocked ? "BLOCKED" : "Active"}
      <p>${(c.addresses || []).map((a) => [a.address, a.city, a.district, a.state, a.pincode].filter(Boolean).join(", ")).join(" | ")}</p>
      <button class="ghost" data-ledger="${c._id}">Ledger</button>
      <button class="${c.blocked ? "ghost" : "danger"}" data-block="${c._id}" data-on="${c.blocked ? "0" : "1"}">${c.blocked ? "Unblock" : "Block"}</button>
      <div id="ledger-${c._id}"></div>
    </div>`).join("") || "<p>No customers yet.</p>"}</div>`;
}

function pagesView() {
  return `<div class="panel"><h2>Contact / FAQs / Legal</h2>
    <form class="form" id="pageForm">
      <label class="field">Slug<select name="slug"><option>contact</option><option>faqs</option><option>legal</option></select></label>
      ${field("title", "Title", "required")}
      <label class="field full">Body<textarea name="body" rows="8"></textarea></label>
      <button class="primary">Save page</button>
    </form>
    ${(cache.pages || []).map((p) => `<p><strong>${p.slug}</strong> — ${p.title}</p>`).join("")}
  </div>`;
}

function settingsView() {
  const s = cache.settings || {};
  return `<div class="panel"><h2>Storefront settings</h2>
    <div class="settings-layout">
      <form class="form" id="settingsForm">
        <label class="field"><span>Store name</span><input name="storeName" value="${String(s.storeName || "").replace(/"/g, "&quot;")}"></label>
        <label class="field"><span>Tagline</span><input name="tagline" value="${String(s.tagline || "").replace(/"/g, "&quot;")}"></label>
        <label class="field full"><span>Announcement text</span><input name="announcementText" value="${String(s.announcementText || "").replace(/"/g, "&quot;")}"></label>
        <label class="field"><span>WhatsApp Business number</span><input name="contactPhone" placeholder="+91 98765 43210" value="${String(s.contactPhone || "").replace(/"/g, "&quot;")}"><small>Direct customer order flow opens this number in WhatsApp.</small></label>
        <label class="field full"><span>WhatsApp message template</span><textarea name="whatsappMessage" rows="6" placeholder="Hello Vastra Sanvedan,\nI want to order:\n{productLines}\n\nTotal: {total}{customerInfo}\n\nPlease confirm availability and delivery details.">${String(s.whatsappMessage || "Hello Vastra Sanvedan,\nI want to order:\n{productLines}\n\nTotal: {total}{customerInfo}\n\nPlease confirm availability and delivery details.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea><small>Use {productLines}, {total}, and {customerInfo} placeholders. Customers will open this message directly in WhatsApp.</small></label>
        <label class="field"><span>Contact email</span><input name="contactEmail" value="${String(s.contactEmail || "").replace(/"/g, "&quot;")}"></label>
        <label class="field full"><span>Footer text</span><input name="footerText" value="${String(s.footerText || "").replace(/"/g, "&quot;")}"></label>
        <label class="field full"><span>Printed bill heading</span><textarea name="receiptHeaderText" rows="3" placeholder="Retail Billing Receipt">${String(s.receiptHeaderText || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea><small>Shown below the store name on every POS bill. Use a new line for multiple lines.</small></label>
        <label class="field full"><span>Printed bill footer</span><textarea name="receiptFooterText" rows="4" placeholder="Thank you for shopping with us.\nVisit again soon.">${String(s.receiptFooterText || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea><small>Custom message printed at the bottom of every POS bill.</small></label>
        <label class="field"><span>Primary color</span><input name="primaryColor" type="color" value="${s.primaryColor || "#1c1814"}"></label>
        <label class="field"><span>Accent color</span><input name="accentColor" type="color" value="${s.accentColor || "#d9c3a0"}"></label>
        <label class="field"><span>Website background</span><input name="backgroundColor" type="color" value="${s.backgroundColor || "#f4efe8"}"></label>
        <label class="field"><span>Website white / panels</span><input name="surfaceColor" type="color" value="${s.surfaceColor || "#fbf8f3"}"></label>
        <label class="field"><span>Main words color</span><input name="textColor" type="color" value="${s.textColor || "#1c1814"}"></label>
        <label class="field"><span>Main headings color</span><input name="headingColor" type="color" value="${s.headingColor || "#faf8f5"}"></label>
        <label class="field"><span>Body text color</span><input name="bodyColor" type="color" value="${s.bodyColor || "#fffdf9"}"></label>
        <label class="field"><span>Shop name / logo color</span><input name="brandColor" type="color" value="${s.brandColor || "#d4af37"}"></label>
        <label class="field"><span>Button color</span><input name="buttonColor" type="color" value="${s.buttonColor || "#d4af37"}"></label>
        <label class="field"><span>Button label color</span><input name="buttonTextColor" type="color" value="${s.buttonTextColor || "#5a0016"}"></label>
        <label class="field"><span>Muted words color</span><input name="mutedColor" type="color" value="${s.mutedColor || "#7b7369"}"></label>
        <label class="field"><span>Keyword / highlight color</span><input name="keywordColor" type="color" value="${s.keywordColor || "#d4af37"}"></label>
        <label class="field"><span>Website font</span><select name="fontFamily"><option ${s.fontFamily === "Outfit" ? "selected" : ""}>Outfit</option><option ${s.fontFamily === "Cinzel" ? "selected" : ""}>Cinzel</option><option ${s.fontFamily === "Cormorant Garamond" ? "selected" : ""}>Cormorant Garamond</option><option ${s.fontFamily === "Playfair Display" ? "selected" : ""}>Playfair Display</option><option ${s.fontFamily === "DM Sans" ? "selected" : ""}>DM Sans</option><option ${s.fontFamily === "Lora" ? "selected" : ""}>Lora</option></select></label>
        <label class="field"><span>Hero button text</span><input name="heroButtonText" value="${String(s.heroButtonText || "").replace(/"/g, "&quot;")}"></label>
        <label class="field"><span>Hero button link</span><input name="heroButtonLink" value="${String(s.heroButtonLink || "").replace(/"/g, "&quot;")}"></label>
        <label class="field full"><span>Brand logo / primary visual</span><input name="brandLogo" placeholder="Optional image URL"><input id="brandLogoFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <p class="settings-note">Customers send product and order details directly to this WhatsApp Business number. Confirm price, availability, payment and delivery with the customer in WhatsApp.</p>
        <button class="primary">Save settings</button>
      </form>
      <div class="store-preview-panel">
        <div class="store-preview-header">
          <span class="mini-tag">Live preview</span>
        </div>
        <div class="store-preview-card" style="background: linear-gradient(135deg, ${s.primaryColor || '#1c1814'} 0%, ${s.accentColor || '#d9c3a0'} 120%);">
          <div class="preview-mark">VS</div>
          <div>
            <h3>${String(s.storeName || 'Vastra Sanvedan').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
            <p>${String(s.tagline || 'Clothes with a point of view.').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <button class="preview-button">${String(s.heroButtonText || 'Explore the collection').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bannersView() {
  const items = cache.announcements || [];
  return `<div class="panel"><h2>Live banners</h2><p class="subtle">Active banners scroll across the storefront and appear at the top of the customer My Orders page.</p>
    <form class="form" id="announcementForm">
      <input type="hidden" name="id">
      <label class="field full">Promo text<textarea name="text" rows="3" required></textarea></label>
      <label class="field full">Banner image<input name="image" placeholder="Choose a banner image below" readonly><input id="announcementImage" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="field">Order<input name="displayOrder" type="number" value="0"></label>
      <label class="field full"><input name="active" type="checkbox" checked> Active</label>
      <button class="primary" type="submit">Save banner</button>
    </form>
    <div class="announcement-list">
      ${(items.length ? items.map((item) => `<div class="announcement-item">
        <strong>${String(item.text || "Promo").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong>
        ${item.image ? `<img class="announcement-image" src="${item.image}" alt="Banner preview">` : "<p>No image uploaded</p>"}
        <div class="row-actions">
          <button class="ghost" data-edit-announcement="${item._id}">Edit</button>
          <button class="danger" data-del-announcement="${item._id}">Delete</button>
        </div>
      </div>`).join("") : "<p>No promo banners yet.</p>")}
    </div>
  </div>`;
}

function render() {
  const view = {
    dashboard, studio, banners: bannersView, categories: () => catalogForm("categories"), brands: () => catalogForm("brands"),
    products: productsView, barcodeStudio, inventory: inventoryView, orders: ordersView,
    analytics: dashboard, pages: pagesView, settings: settingsView,
  }[tab];
  $("#view").innerHTML = view();
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll("[data-quick-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.quickTab) {
        tab = button.dataset.quickTab;
        render();
      }
    });
  });
  bindView();
}

function fillForm(form, data) {
  Object.entries(data).forEach(([k, v]) => {
    if (form.elements[k] && typeof v !== "object") form.elements[k].value = v ?? "";
  });
  if (form.elements.active) form.elements.active.checked = data.active !== false;
}

function bindView() {
  $("#sectionForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const values = Object.fromEntries(new FormData(form));
    const id = values.id; delete values.id;
    try {
      values.image = await fileUrl($("#imageFile"), values.image);
      values.mobileImage = await fileUrl($("#mobileFile"), values.mobileImage);
      values.videoUrl = await fileUrl($("#videoFile"), values.videoUrl);
      values.posterImage = await fileUrl($("#posterFile"), values.posterImage);
      values.displayOrder = Number(values.displayOrder || 0);
      values.active = form.active.checked;
      values.products = String(values.products || "").split(",").map((x) => x.trim()).filter(Boolean);
      await api(id ? `/content/sections/${id}` : "/content/sections", { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
      await reload();
    } catch (error) { notice(error.message); }
  });

  bindDirectUploads();
  document.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => {
    const s = cache.sections.find((x) => x._id === b.dataset.edit);
    const form = $("#sectionForm");
    fillForm(form, { ...s, products: (s.products || []).map((p) => p._id || p).join(",") });
    form.id.value = s._id;
  });
  document.querySelectorAll("[data-toggle]").forEach((b) => b.onclick = async () => {
    const s = cache.sections.find((x) => x._id === b.dataset.toggle);
    await api(`/content/sections/${s._id}`, { method: "PUT", body: JSON.stringify({ ...s, products: (s.products || []).map((p) => p._id || p), active: !s.active }) });
    await reload();
  });
  document.querySelectorAll("[data-move]").forEach((b) => b.onclick = async () => {
    const list = cache.sections;
    const i = list.findIndex((x) => x._id === b.dataset.move);
    const j = b.dataset.dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    await Promise.all([
      api(`/content/sections/${list[i]._id}`, { method: "PUT", body: JSON.stringify({ ...list[i], displayOrder: list[j].displayOrder }) }),
      api(`/content/sections/${list[j]._id}`, { method: "PUT", body: JSON.stringify({ ...list[j], displayOrder: list[i].displayOrder }) }),
    ]);
    await reload();
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await api(`/content/sections/${b.dataset.del}`, { method: "DELETE" }); await reload(); });

  $("#announcementForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const values = Object.fromEntries(new FormData(form));
    const id = values.id; delete values.id;
    try {
      values.image = await fileUrl($("#announcementImage"), values.image);
      values.displayOrder = Number(values.displayOrder || 0);
      values.active = form.active.checked;
      await api(id ? `/content/announcements/${id}` : "/content/announcements", { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
      await reload();
    } catch (error) { notice(error.message); }
  });
  document.querySelectorAll("[data-edit-announcement]").forEach((b) => b.onclick = () => {
    const item = (cache.announcements || []).find((x) => x._id === b.dataset.editAnnouncement);
    const form = $("#announcementForm");
    fillForm(form, item);
    form.id.value = item._id;
    form.active.checked = item.active !== false;
  });
  document.querySelectorAll("[data-del-announcement]").forEach((b) => b.onclick = async () => {
    await api(`/content/announcements/${b.dataset.delAnnouncement}`, { method: "DELETE" });
    await reload();
  });

  const bindCatalog = (kind, path) => {
    $(`#${kind}Form`)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const values = Object.fromEntries(new FormData(form));
      const id = values.id; delete values.id;
      try {
        const uploaded = await fileUrl($( `#${kind}File`), "");
        if (kind === "brands") values.logo = uploaded || values.logo;
        else values.image = uploaded || values.image;
        values.active = form.active.checked;
        values.displayOrder = Number(values.displayOrder || 0);
        await api(id ? `${path}/${id}` : path, { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
        await reload();
      } catch (error) { notice(error.message); }
    });
    document.querySelectorAll(`[data-edit-${kind}]`).forEach((b) => b.onclick = () => {
      const item = cache[kind].find((x) => x._id === b.getAttribute(`data-edit-${kind}`));
      fillForm($(`#${kind}Form`), item);
      $(`#${kind}Form`).id.value = item._id;
    });
    document.querySelectorAll(`[data-del-${kind}]`).forEach((b) => b.onclick = async () => { await api(`${path}/${b.getAttribute(`data-del-${kind}`)}`, { method: "DELETE" }); await reload(); });
  };
  bindCatalog("categories", "/categories");
  bindCatalog("brands", "/brands");

  $("#productForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const values = Object.fromEntries(new FormData(form));
    const id = values.id; delete values.id;
    try {
      const files = [...($("#productImages")?.files || [])];
      const uploaded = [];
      for (const file of files) uploaded.push(await fileUrl(file).catch(async () => dataUrlFallback(file)));
      const payload = {
        ...values,
        mrp: +values.mrp, sellingPrice: +values.sellingPrice, stock: +values.stock,
        sizes: form.productNoSize.checked ? [] : String(values.sizes || "").split(",").map((x) => x.trim()).filter(Boolean),
        colors: String(values.colors || "").split(",").map((x) => x.trim()).filter(Boolean),
        images: [...String(values.images || "").split(",").map((x) => x.trim()).filter(Boolean), ...uploaded],
        active: form.active.checked, newArrival: form.newArrival.checked, featured: form.featured.checked, trending: form.trending.checked,
      };
      await api(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
      await reload();
    } catch (error) { notice(error.message); }
  });
  document.querySelectorAll("[data-size-preset]").forEach((button) => button.onclick = () => {
    const input = $("#productSizes");
    const sizes = new Set(String(input.value || "").split(",").map((size) => size.trim()).filter(Boolean));
    sizes.has(button.dataset.sizePreset) ? sizes.delete(button.dataset.sizePreset) : sizes.add(button.dataset.sizePreset);
    input.value = [...sizes].join(", ");
    $("#productNoSize").checked = false;
  });
  $("#productNoSize")?.addEventListener("change", (event) => {
    $("#productSizes").disabled = event.target.checked;
    document.querySelectorAll("[data-size-preset]").forEach((button) => { button.disabled = event.target.checked; });
    if (event.target.checked) $("#productSizes").value = "";
  });
  document.querySelectorAll("[data-edit-product]").forEach((b) => b.onclick = () => {
    const p = cache.products.find((x) => x._id === b.dataset.editProduct);
    const form = $("#productForm");
    fillForm(form, { ...p, images: (p.images || []).filter((x) => !String(x).startsWith("data:")).join(", "), sizes: (p.sizes || []).join(", "), colors: (p.colors || []).join(", ") });
    form.id.value = p._id;
    form.active.checked = p.active;
    form.newArrival.checked = p.newArrival;
    form.featured.checked = p.featured;
    form.trending.checked = p.trending;
    form.productNoSize.checked = !(p.sizes || []).length;
    form.productSizes.disabled = form.productNoSize.checked;
    document.querySelectorAll("[data-size-preset]").forEach((button) => { button.disabled = form.productNoSize.checked; });
  });
  document.querySelectorAll("[data-active-product]").forEach((b) => b.onclick = async () => {
    const p = cache.products.find((x) => x._id === b.dataset.activeProduct);
    await api(`/products/${p._id}/active`, { method: "PATCH", body: JSON.stringify({ active: !p.active }) });
    await reload();
  });
  document.querySelectorAll("[data-del-product]").forEach((b) => b.onclick = async () => {
    if (!confirm("Permanently delete this product?")) return;
    await api(`/products/${b.dataset.delProduct}`, { method: "DELETE" });
    await reload();
  });
  document.querySelectorAll("[data-copy-product-id]").forEach((b) => b.onclick = async () => {
    await navigator.clipboard.writeText(b.dataset.copyProductId);
    notice("Product ID copied. Paste it into Homepage Studio.");
  });

  bindBarcodeStudio();

  document.querySelectorAll(".status-form").forEach((form) => form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(form));
      await api(`/orders/${form.dataset.order}/status`, { method: "PATCH", body: JSON.stringify(values) });
      notice("Order status updated. Customer status is now refreshed.");
      await reload();
    } catch (error) { notice(error.message); }
  });
  document.querySelectorAll(".pay-form").forEach((form) => form.onsubmit = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    await api(`/orders/${form.dataset.order}/verify-payment`, { method: "POST", body: JSON.stringify({ receivedAmount: Number(values.receivedAmount), reference: values.reference }) });
    await reload();
  });
  document.querySelectorAll("[data-fail]").forEach((b) => b.onclick = async () => { await api(`/orders/${b.dataset.fail}/fail-payment`, { method: "POST", body: JSON.stringify({}) }); await reload(); });
  document.querySelectorAll("[data-block]").forEach((b) => b.onclick = async () => {
    try {
      const blocked = b.dataset.on === "1";
      const reason = blocked ? prompt("Reason for block (audit trail)") || "Blocked by admin" : "";
      await api(`/customers/${b.dataset.block}/block`, { method: "POST", body: JSON.stringify({ blocked, reason }) });
      notice(blocked ? "Customer blocked and active sessions signed out." : "Customer unblocked.");
      await reload();
    } catch (error) { notice(error.message); }
  });
  document.querySelectorAll("[data-ledger]").forEach((b) => b.onclick = async () => {
    const data = await api(`/customers/${b.dataset.ledger}`);
    $(`#ledger-${b.dataset.ledger}`).innerHTML = `<p>Orders ${data.ledger.totalOrders} · Spent ${money(data.ledger.totalSpent)} · Online ${data.ledger.online} · Offline ${data.ledger.offline}</p>` +
      (data.orders || []).map((o) => `<small>${o.invoiceNumber} ${o.orderType} ${money(o.totalAmount)} ${o.paymentStatus}</small>`).join("<br>");
  });
  $("#pageForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    await api(`/pages/${values.slug}`, { method: "PUT", body: JSON.stringify(values) });
    await reload();
  });
  $("#settingsForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    await api("/settings", { method: "PUT", body: JSON.stringify({
      storeName: form.storeName.value.trim(),
      tagline: form.tagline.value.trim(),
      announcementText: form.announcementText.value.trim(),
      contactPhone: form.contactPhone.value.trim(),
      whatsappMessage: form.whatsappMessage.value.trim() || "Hello Vastra Sanvedan,\nI want to order:\n{productLines}\n\nTotal: {total}{customerInfo}\n\nPlease confirm availability and delivery details.",
      contactEmail: form.contactEmail.value.trim(),
      footerText: form.footerText.value.trim(),
      receiptHeaderText: form.receiptHeaderText.value.trim(),
      receiptFooterText: form.receiptFooterText.value.trim(),
      primaryColor: form.primaryColor.value.trim(),
      accentColor: form.accentColor.value.trim(),
      backgroundColor: form.backgroundColor.value.trim(),
      surfaceColor: form.surfaceColor.value.trim(),
      textColor: form.textColor.value.trim(),
      headingColor: form.headingColor.value.trim(),
      bodyColor: form.bodyColor.value.trim(),
      brandColor: form.brandColor.value.trim(),
      buttonColor: form.buttonColor.value.trim(),
      buttonTextColor: form.buttonTextColor.value.trim(),
      mutedColor: form.mutedColor.value.trim(),
      keywordColor: form.keywordColor.value.trim(),
      fontFamily: form.fontFamily.value,
      heroButtonText: form.heroButtonText.value.trim(),
      heroButtonLink: form.heroButtonLink.value.trim(),
      brandLogo: form.brandLogo.value.trim(),
    }) });
    await reload();
    notice("Website colours and font saved. Refresh the customer website to see the changes.");
  });
}

function bindBarcodeStudio() {
  const form = $("#barcodeStudioForm");
  if (!form) return;

  const previewSvg = $("#barcodePreviewSvg");
  const productSelect = $("#barcodeProductSelect");
  const barcodeValueInput = $("#barcodeValueInput");
  const labelSizeSelect = $("#barcodeLabelSize");
  const customSizeRow = $("#barcodeCustomSizeRow");
  const customWidthInput = $("#barcodeCustomWidth");
  const customHeightInput = $("#barcodeCustomHeight");
  const quantityInput = $("#barcodeQuantityInput");
  const messageBox = $("#barcodeStudioMessage");
  const previewName = $("#barcodePreviewName");
  const previewMeta = $("#barcodePreviewMeta");
  const previewValue = $("#barcodePreviewValue");
  const previewSku = $("#barcodePreviewSku");
  const previewPrice = $("#barcodePreviewPrice");
  const labelGrid = $("#barcodeLabelGrid");

  const state = {
    format: "CODE128",
    quantity: 1,
    productId: "",
    codeValue: "",
    labelSize: "medium",
  };

  const safeProductName = (product) => product && product.name ? product.name : "Product";
  const getSelectedProduct = () => cache.products.find((product) => product._id === productSelect.value) || null;

  const formatBarcodeValue = (value, type) => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (type === "EAN13") {
      const digits = text.replace(/\D/g, "").slice(0, 13);
      if (!/^\d{12,13}$/.test(digits)) return "";
      const padded = digits.padStart(12, "0").slice(0, 12);
      const checksum = padded.split("").reduce((sum, char, index) => sum + Number(char) * (index % 2 === 0 ? 1 : 3), 0);
      return `${padded}${(10 - (checksum % 10)) % 10}`;
    }
    if (type === "UPCA") {
      const digits = text.replace(/\D/g, "").slice(0, 12);
      return /^\d{12}$/.test(digits) ? digits : "";
    }
    return text;
  };

  const numericSeed = (product) => {
    const fallback = String(product?.barcode || product?._id || "VS000000000").replace(/\D/g, "");
    const digits = fallback.length >= 12 ? fallback.slice(-12) : `${String(Date.now()).slice(-8)}${String(Math.random()).slice(2, 5).padStart(3, "0")}`;
    return digits.slice(-12);
  };

  const generateNumericValue = (product, type) => {
    const digits = numericSeed(product);
    if (type === "UPCA") return digits.slice(-12);
    const body = digits.slice(-12);
    const checksum = body.split("").reduce((sum, char, index) => sum + Number(char) * (index % 2 === 0 ? 1 : 3), 0);
    return `${body}${(10 - (checksum % 10)) % 10}`;
  };

  const generateRecommendedValue = (product, type = state.format || "CODE128") => {
    const productBarcode = String(product?.barcode || "").trim();
    if (productBarcode && type === "CODE128") return productBarcode;
    if (productBarcode && (type === "EAN13" || type === "UPCA")) {
      const digits = productBarcode.replace(/\D/g, "");
      if (type === "UPCA" && /^\d{12}$/.test(digits)) return digits;
      if (type === "EAN13" && /^\d{12,13}$/.test(digits)) return formatBarcodeValue(digits, "EAN13");
    }
    if (type === "EAN13") return generateNumericValue(product, "EAN13");
    if (type === "UPCA") return generateNumericValue(product, "UPCA");
    const base = product && product.name ? product.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) : "VS";
    const suffix = product && product._id ? String(product._id).slice(-6).toUpperCase() : String(Date.now()).slice(-6);
    return `${base || "VS"}${suffix}`.slice(0, 18);
  };

  const labelSizeMap = {
    small: { width: 80, height: 52 },
    medium: { width: 120, height: 78 },
    large: { width: 160, height: 104 },
  };

  const getSelectedLabelDimensions = () => {
    const size = labelSizeSelect.value || "medium";
    if (size === "custom") {
      const width = Number(customWidthInput.value) || 80;
      const height = Number(customHeightInput.value) || 52;
      return { width: Math.min(Math.max(width, 60), 220), height: Math.min(Math.max(height, 30), 140) };
    }
    return labelSizeMap[size] || labelSizeMap.medium;
  };

  const showMessage = (message, tone = "info") => {
    if (!messageBox) return;
    messageBox.textContent = message || "";
    messageBox.className = `barcode-message ${tone}`;
  };

  const renderPrimarySvg = (value, format) => {
    if (!previewSvg) return;
    previewSvg.innerHTML = "";
    previewSvg.removeAttribute("width");
    previewSvg.removeAttribute("height");
    previewSvg.setAttribute("viewBox", "0 0 420 180");
    previewSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    if (!value) {
      previewSvg.setAttribute("width", "340");
      previewSvg.setAttribute("height", "120");
      previewSvg.innerHTML = `<rect x="0" y="0" width="420" height="180" fill="#ffffff" rx="14"/><text x="210" y="95" text-anchor="middle" fill="#777" font-size="20" font-family="Outfit, sans-serif">Barcode preview</text>`;
      return;
    }

    try {
      const formatKey = format === "EAN13" ? "ean13" : format === "UPCA" ? "upc" : "CODE128";
      if (window.JsBarcode) {
        JsBarcode(previewSvg, value, {
          format: formatKey,
          displayValue: true,
          fontSize: 15,
          lineColor: "#111827",
          background: "#ffffff",
          width: 2,
          height: 78,
          margin: 16,
          marginTop: 12,
          marginBottom: 8,
          flat: false,
          valid: true,
        });
      }
    } catch (error) {
      console.error("Barcode render error:", error);
      showMessage("Unable to generate barcode. Please check the barcode value.", "error");
      previewSvg.innerHTML = `<rect x="0" y="0" width="420" height="180" fill="#ffffff" rx="14"/><text x="210" y="95" text-anchor="middle" fill="#a11d1d" font-size="20" font-family="Outfit, sans-serif">Barcode unavailable</text>`;
    }
  };

  const renderLabelGrid = () => {
    if (!labelGrid) return;
    const product = getSelectedProduct();
    const quantity = Math.min(Math.max(Number(quantityInput.value) || 1, 1), 24);
    const codeValue = String(barcodeValueInput.value || state.codeValue || "").trim();
    const format = form.format.value || "CODE128";
    const dims = getSelectedLabelDimensions();
    const showName = form.querySelector('input[name="showName"]')?.checked !== false;
    const showSku = form.querySelector('input[name="showSku"]')?.checked !== false;
    const showPrice = form.querySelector('input[name="showPrice"]')?.checked !== false;
    const showCategory = form.querySelector('input[name="showCategory"]')?.checked;
    const showShop = form.querySelector('input[name="showShop"]')?.checked;
    const productName = product ? product.name : "Product";
    const productSku = product?.barcode || "VS-001";
    const productPrice = product && Number(product.sellingPrice || product.price || 0) ? money(product.sellingPrice || product.price) : "₹0";
    const shopName = "Vastra Sanvedan";

    labelGrid.innerHTML = Array.from({ length: quantity }, (_, index) => {
      const cardMarkup = `
        <div class="barcode-label-card" style="width:100%; max-width:${dims.width}px;">
          ${showShop ? `<div class="label-header">${escapeHtml(shopName)}</div>` : ""}
          ${showName ? `<div class="label-product-name">${escapeHtml(productName)}</div>` : ""}
          <div class="label-barcode" style="min-height:${Math.max(70, dims.height * 0.7)}px;">
            <svg data-label-svg="${index}" viewBox="0 0 320 120" width="100%" height="100%" aria-label="Generated barcode label ${index + 1}"></svg>
          </div>
          ${showSku ? `<div class="label-line">SKU: ${escapeHtml(productSku || "VS-001")}</div>` : ""}
          ${showCategory ? `<div class="label-line">Category: ${escapeHtml(product?.category || "General")}</div>` : ""}
          ${showPrice ? `<div class="label-price">${escapeHtml(productPrice)}</div>` : ""}
        </div>
      `;
      return cardMarkup;
    }).join("");

    if (!window.JsBarcode || !codeValue) return;
    labelGrid.querySelectorAll("[data-label-svg]").forEach((svg) => {
      const formatKey = format === "EAN13" ? "ean13" : format === "UPCA" ? "upc" : "CODE128";
      JsBarcode(svg, codeValue, {
        format: formatKey,
        displayValue: true,
        fontSize: 12,
        lineColor: "#111827",
        background: "#ffffff",
        width: 2,
        height: 52,
        margin: 8,
        marginTop: 8,
        marginBottom: 12,
      });
    });
  };

  const updateFromProduct = () => {
    const product = getSelectedProduct();
    if (!product) {
      previewName.textContent = "Select a product";
      previewMeta.textContent = "Ready for barcode generation";
      previewValue.textContent = "No barcode generated";
      previewSku.textContent = "SKU: —";
      previewPrice.textContent = "Price: —";
      showMessage("", "info");
      return;
    }

    const nextValue = String(product.barcode || "").trim();
    previewName.textContent = product.name;
    previewMeta.textContent = product.category || "General";
    previewSku.textContent = `SKU: ${product.barcode || "No barcode available"}`;
    previewPrice.textContent = `Price: ${money(product.sellingPrice || product.price || 0)}`;

    if (!nextValue) {
      showMessage("No barcode available for this product. A valid Code 128 value will be generated for this item.", "info");
      barcodeValueInput.value = generateRecommendedValue(product, form.format.value || "CODE128");
    } else {
      barcodeValueInput.value = nextValue;
      showMessage("", "info");
    }

    state.productId = product._id;
    state.codeValue = barcodeValueInput.value.trim();
    form.format.value = form.format.value || "CODE128";
    renderPrimarySvg(state.codeValue, form.format.value || "CODE128");
    previewValue.textContent = state.codeValue || "No barcode generated";
    renderLabelGrid();
  };

  const applyBarcodeValue = () => {
    const product = getSelectedProduct();
    const format = form.format.value || "CODE128";
    let candidate = String(barcodeValueInput.value || "").trim();

    if (!candidate) {
      candidate = generateRecommendedValue(product, format);
      barcodeValueInput.value = candidate;
    }

    const validValue = formatBarcodeValue(candidate, format);
    if (!validValue) {
      const generated = generateRecommendedValue(product, format);
      barcodeValueInput.value = generated;
      showMessage("Unable to generate barcode. Please check the barcode value.", "error");
      console.error("Invalid barcode value for format", { format, value: candidate, product: product ? product.name : null });
      return null;
    }

    state.codeValue = validValue;
    barcodeValueInput.value = validValue;
    previewValue.textContent = validValue;
    previewName.textContent = product ? product.name : "Product";
    previewMeta.textContent = product ? product.category || "General" : "Ready for barcode generation";
    previewSku.textContent = `SKU: ${product?.barcode || validValue}`;
    previewPrice.textContent = `Price: ${product ? money(product.sellingPrice || product.price || 0) : "₹0"}`;
    showMessage("", "info");
    renderPrimarySvg(validValue, format);
    renderLabelGrid();
    return validValue;
  };

  productSelect.addEventListener("change", () => {
    const product = getSelectedProduct();
    if (!product) {
      showMessage("Select a product to generate a barcode.", "info");
      return;
    }
    const nextFormat = form.format.value || "CODE128";
    barcodeValueInput.value = product.barcode || generateRecommendedValue(product, nextFormat);
    updateFromProduct();
  });

  form.format.addEventListener("change", () => {
    state.format = form.format.value;
    const product = getSelectedProduct();
    if (product) {
      const suggestedValue = generateRecommendedValue(product, state.format);
      barcodeValueInput.value = suggestedValue;
      applyBarcodeValue();
    }
  });

  labelSizeSelect.addEventListener("change", () => {
    const size = labelSizeSelect.value;
    customSizeRow.hidden = size !== "custom";
    renderLabelGrid();
  });
  customWidthInput.addEventListener("input", renderLabelGrid);
  customHeightInput.addEventListener("input", renderLabelGrid);

  $("#barcodeQtyMinus").addEventListener("click", () => {
    const next = Math.max(1, (Number(quantityInput.value) || 1) - 1);
    quantityInput.value = next;
    state.quantity = next;
    renderLabelGrid();
  });

  $("#barcodeQtyPlus").addEventListener("click", () => {
    const next = Math.min(24, (Number(quantityInput.value) || 1) + 1);
    quantityInput.value = next;
    state.quantity = next;
    renderLabelGrid();
  });

  quantityInput.addEventListener("input", () => {
    const next = Math.min(24, Math.max(1, Number(quantityInput.value) || 1));
    quantityInput.value = next;
    state.quantity = next;
    renderLabelGrid();
  });

  $("#generateBarcodeBtn").addEventListener("click", () => {
    const product = getSelectedProduct();
    const format = form.format.value || "CODE128";
    const value = generateRecommendedValue(product, format);
    barcodeValueInput.value = value;
    const result = applyBarcodeValue();
    if (!result) {
      showMessage("Unable to generate barcode. Please check the barcode value.", "error");
      console.error("Barcode generation failed for product", product ? product.name : "unknown");
      return;
    }
    showMessage(product ? `Barcode generated for ${product.name}.` : "Barcode generated successfully.", "success");
  });

  $("#resetBarcodeBtn").addEventListener("click", () => {
    form.reset();
    productSelect.value = "";
    labelSizeSelect.value = "medium";
    customSizeRow.hidden = true;
    quantityInput.value = 1;
    barcodeValueInput.value = "";
    state.codeValue = "";
    previewSvg.innerHTML = "";
    previewName.textContent = "Select a product";
    previewMeta.textContent = "Ready for barcode generation";
    previewValue.textContent = "No barcode generated";
    previewSku.textContent = "SKU: —";
    previewPrice.textContent = "Price: —";
    labelGrid.innerHTML = "";
    showMessage("Barcode studio reset.", "info");
  });

  $("#downloadSvgBtn").addEventListener("click", () => {
    if (!state.codeValue) {
      showMessage("Generate or select a barcode before downloading.", "error");
      return;
    }
    const markup = new XMLSerializer().serializeToString(previewSvg);
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.codeValue}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  $("#downloadPngBtn").addEventListener("click", () => {
    if (!state.codeValue) {
      showMessage("Generate or select a barcode before downloading as PNG.", "error");
      return;
    }

    try {
      const svgMarkup = new XMLSerializer().serializeToString(previewSvg);
      const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const width = previewSvg.viewBox.baseVal.width || previewSvg.clientWidth || 420;
        const height = previewSvg.viewBox.baseVal.height || previewSvg.clientHeight || 180;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            showMessage("Unable to download PNG for this barcode.", "error");
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = pngUrl;
          anchor.download = `${state.codeValue}.png`;
          anchor.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, "image/png");
      };
      image.onerror = () => {
        showMessage("Unable to generate PNG export. Check the current barcode SVG.", "error");
        URL.revokeObjectURL(url);
      };
      image.src = url;
    } catch (error) {
      console.error("PNG export failed:", error);
      showMessage("Unable to export PNG. Please check the current barcode.", "error");
    }
  });

  $("#printBarcodeBtn").addEventListener("click", () => {
    if (!state.codeValue) {
      showMessage("Generate or select a barcode before printing labels.", "error");
      return;
    }

    const product = getSelectedProduct();
    const quantity = Math.min(Math.max(Number(quantityInput.value) || 1, 1), 24);
    const format = form.format.value || "CODE128";
    const labelCards = Array.from({ length: quantity }, (_, index) => {
      const productName = product ? product.name : "Product";
      const productSku = product?.barcode || state.codeValue;
      const priceText = product ? money(product.sellingPrice || product.price || 0) : "₹0";
      const showName = form.querySelector('input[name="showName"]')?.checked !== false;
      const showSku = form.querySelector('input[name="showSku"]')?.checked !== false;
      const showPrice = form.querySelector('input[name="showPrice"]')?.checked !== false;
      const showCategory = form.querySelector('input[name="showCategory"]')?.checked;
      const showShop = form.querySelector('input[name="showShop"]')?.checked;
      const dims = getSelectedLabelDimensions();
      return `
        <div class="print-label-card" style="width:${dims.width}px; min-height:${dims.height}px;">
          ${showShop ? `<div class="print-label-shop">Vastra Sanvedan</div>` : ""}
          ${showName ? `<div class="print-label-name">${escapeHtml(productName)}</div>` : ""}
          <div class="print-barcode-wrap">
            <svg data-print-svg="${index}" viewBox="0 0 320 120" width="100%" height="100%"></svg>
          </div>
          ${showSku ? `<div class="print-label-meta">SKU: ${escapeHtml(productSku)}</div>` : ""}
          ${showCategory ? `<div class="print-label-meta">Category: ${escapeHtml(product?.category || "General")}</div>` : ""}
          ${showPrice ? `<div class="print-label-price">${escapeHtml(priceText)}</div>` : ""}
        </div>
      `;
    }).join("");

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      showMessage("Allow pop-ups to print the barcode labels.", "error");
      return;
    }

    popup.document.write(`<!doctype html><html><head><title>Print Barcode Labels</title><style>
      *{box-sizing:border-box} body{margin:0;padding:16px;background:#fff;color:#111;font-family:Outfit,Arial,sans-serif}
      .print-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:start}
      .print-label-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border:1px solid #ded6cb;border-radius:10px;background:#fff;page-break-inside:avoid}
      .print-label-shop{font-size:13px;font-weight:600;text-align:center}
      .print-label-name{font-size:14px;font-weight:600;text-align:center;line-height:1.3}
      .print-barcode-wrap{display:flex;justify-content:center;align-items:center;width:100%;min-height:72px;background:#fff;border:1px solid #f1eadf;border-radius:8px;padding:6px}
      .print-label-meta,.print-label-price{font-size:12px;color:#1d2430;text-align:center}
      .print-label-price{font-weight:700}
      @media print{body{padding:8px} .print-grid{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}}
    </style></head><body><div class="print-grid">${labelCards}</div><script>window.onload = () => setTimeout(() => window.print(), 150);<\/script></body></html>`);

    popup.document.close();
    const renderPrintBarcodes = () => {
      const barcodes = popup.document.querySelectorAll("[data-print-svg]");
      if (!window.JsBarcode || !barcodes.length) return;
      const formatKey = format === "EAN13" ? "ean13" : format === "UPCA" ? "upc" : "CODE128";
      barcodes.forEach((svg) => {
        JsBarcode(svg, state.codeValue, {
          format: formatKey,
          displayValue: true,
          fontSize: 11,
          lineColor: "#111827",
          background: "#ffffff",
          width: 2,
          height: 52,
          margin: 8,
          marginTop: 8,
          marginBottom: 10,
        });
      });
    };
    setTimeout(renderPrintBarcodes, 250);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const product = getSelectedProduct();
    if (!product) {
      showMessage("Select a product before saving the barcode.", "error");
      return;
    }
    const value = applyBarcodeValue();
    if (!value) {
      showMessage("Unable to generate barcode. Please check the barcode value.", "error");
      console.error("Barcode save failed for product", product.name, { value: barcodeValueInput.value });
      return;
    }

    try {
      const payload = {
        ...product,
        barcode: value,
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
        images: Array.isArray(product.images) ? product.images : [],
      };
      await api(`/products/${product._id}`, { method: "PUT", body: JSON.stringify(payload) });
      showMessage(`Barcode saved for ${product.name}.`, "success");
      notice(`Barcode saved for ${product.name}. POS can scan it now.`);
      await reload();
      tab = "barcodeStudio";
      render();
    } catch (error) {
      console.error("Barcode save failed:", error);
      showMessage(error.message || "Unable to save the barcode.", "error");
    }
  });

  document.querySelectorAll("[data-barcode-product]").forEach((button) => {
    button.addEventListener("click", () => {
      productSelect.value = button.dataset.barcodeProduct || "";
      productSelect.dispatchEvent(new Event("change"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  if (productSelect.value) {
    updateFromProduct();
  } else {
    renderPrimarySvg("", "CODE128");
    renderLabelGrid();
  }
}

async function reload() {
  notice("");
  await loadAll();
  render();
}

function openShell() {
  const shell = $("#shell");
  if (shell) shell.hidden = false;
  reload().catch((error) => notice(error.message));
}

document.querySelectorAll("#nav button").forEach((b) => b.onclick = () => { tab = b.dataset.tab; render(); });

openShell();
