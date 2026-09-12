require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");

const productRoutes = require("./routes/productRoutes");
const shopRoutes = require("./routes/shopRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contentRoutes = require("./routes/contentRoutes");
const customerRoutes = require("./routes/customerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { migrateLegacyProducts } = require("./controllers/productController");
const { ensureUploadDir } = require("./controllers/mediaController");
const Order = require("./models/orderModel");
const { adminPasswordMatches, cookieHeader, clearCookie, readCookie, requireAdmin, hasValidAdminSession } = require("./middleware/auth");
const { uploadMedia } = require("./controllers/mediaController");

const app = express();
const PORT = process.env.PORT || 5000;
const adminSessions = new Map();
const customerSessions = new Map();
const googleOAuthStates = new Map();
const customerOtpChallenges = new Map();
app.locals.adminSessions = adminSessions;
app.locals.customerSessions = customerSessions;
app.locals.googleOAuthStates = googleOAuthStates;
app.locals.customerOtpChallenges = customerOtpChallenges;

app.use(cors({ origin: false }));
app.use("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }));
app.post("/api/admin/media", requireAdmin, express.raw({ type: ["video/mp4", "image/jpeg", "image/png", "image/webp"], limit: "40mb" }), uploadMedia);
app.use(express.json({ limit: "12mb" }));
ensureUploadDir();
app.use((req, res, next) => {
  const blocked = req.path === "/.env" || req.path.endsWith(".env") || req.path.includes("node_modules") || req.path.startsWith("/controllers") || req.path.startsWith("/models") || req.path.startsWith("/routes") || req.path.startsWith("/middleware") || req.path.startsWith("/lib");
  if (blocked) return res.status(404).end();
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(__dirname, { index: false }));

app.get("/admin/login", (_req, res) => res.sendFile(__dirname + "/admin-login.html"));
app.get("/admin", (req, res) => {
  if (!hasValidAdminSession(req)) return res.redirect("/admin/login");
  res.sendFile(__dirname + "/admin.html");
});
app.get("/admin/pos", (req, res) => {
  if (!hasValidAdminSession(req)) return res.redirect("/admin/login");
  res.sendFile(__dirname + "/index.html");
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password ?? "").trim();
  if (!adminPasswordMatches(password)) {
    return res.status(401).json({ success: false, message: "Invalid admin password." });
  }
  const token = crypto.randomBytes(24).toString("hex");
  adminSessions.set(token, { createdAt: new Date().toISOString() });
  res.set("Set-Cookie", cookieHeader("vs_admin_session", token, 60 * 60 * 12));
  return res.json({ success: true, message: "Admin login successful." });
});

app.post("/api/admin/logout", (req, res) => {
  const token = readCookie(req, "vs_admin_session");
  if (token) adminSessions.delete(token);
  res.set("Set-Cookie", clearCookie("vs_admin_session"));
  return res.json({ success: true, message: "Logged out." });
});

app.get("/api/admin/me", (req, res) => {
  if (!hasValidAdminSession(req)) return res.status(401).json({ success: false, message: "Admin session required." });
  return res.json({ success: true, authenticated: true });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Vastra Sanvedan API is live",
    serverTime: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => res.sendFile(__dirname + "/shop.html"));
app.get("/account", (_req, res) => res.redirect("/shop"));
app.get("/orders", (_req, res) => res.redirect("/shop"));
app.get(["/shop", "/product/:id", "/bag", "/checkout", "/contact", "/faqs", "/legal", "/men", "/women", "/kids", "/home-living"], (_req, res) => {
  res.sendFile(__dirname + "/shop.html");
});

app.get("/mobile.html", (_req, res) => {
  res.sendFile(__dirname + "/mobile.html");
});

function normalizePin(value) {
  return String(value ?? "").trim();
}

function hasValidMobilePin(receivedPin) {
  const configuredPin = normalizePin(process.env.MOBILE_TRACKER_PIN);
  const actualPin = normalizePin(receivedPin);
  if (!configuredPin || !actualPin) return false;
  const expected = Buffer.from(configuredPin);
  const actual = Buffer.from(actualPin);
  if (expected.length !== actual.length) return false;
  try {
    return require("crypto").timingSafeEqual(expected, actual);
  } catch (_error) {
    return false;
  }
}

function utcDayRange(dateText) {
  const date = dateText ? new Date(`${dateText}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  if (!dateText) date.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: date, end };
}

async function aggregateSalesForRange(start, end) {
  const [summary] = await Order.aggregate([
    {
      $match: {
        orderStatus: { $nin: ["CANCELLED"] },
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        totalTurnover: { $sum: "$totalAmount" },
        cashCollection: { $sum: { $cond: [{ $eq: ["$paymentMode", "CASH"] }, "$totalAmount", 0] } },
        upiCollection: { $sum: { $cond: [{ $eq: ["$paymentMode", "UPI"] }, "$totalAmount", 0] } },
        billCount: { $sum: 1 },
      },
    },
  ]);
  return summary || { totalTurnover: 0, cashCollection: 0, upiCollection: 0, billCount: 0 };
}

app.get("/api/mobile/summary", async (req, res) => {
  if (!hasValidMobilePin(req.get("X-Mobile-Pin"))) {
    return res.status(401).json({ success: false, message: "Invalid mobile tracker PIN." });
  }
  try {
    const requestedDate = req.query.date || new Date().toISOString().slice(0, 10);
    const selectedRange = utcDayRange(requestedDate);
    if (!selectedRange) return res.status(400).json({ success: false, message: "Invalid date. Use YYYY-MM-DD." });
    const todayRange = utcDayRange();
    const yesterdayStart = new Date(todayRange.start);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayRange = { start: yesterdayStart, end: todayRange.start };
    const [today, yesterday, selectedDate] = await Promise.all([
      aggregateSalesForRange(todayRange.start, todayRange.end),
      aggregateSalesForRange(yesterdayRange.start, yesterdayRange.end),
      aggregateSalesForRange(selectedRange.start, selectedRange.end),
    ]);
    const orders = await Order.find({
      createdAt: { $gte: selectedRange.start, $lt: selectedRange.end },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("invoiceNumber customer totalAmount paymentMode createdAt items")
      .lean();
    return res.set("Cache-Control", "no-store").json({
      success: true,
      generatedAt: new Date().toISOString(),
      selectedDate: requestedDate,
      today,
      yesterday,
      selected: selectedDate,
      recentOrders: orders.map((order) => ({
        id: String(order._id),
        invoiceNumber: order.invoiceNumber,
        customerName: order.customer?.name,
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        createdAt: order.createdAt,
        items: (order.items || []).map((item) => ({
          productName: item.name,
          size: item.size,
          quantity: item.qty,
          unitPrice: item.price,
          totalAmount: item.price * item.qty,
        })),
      })),
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Cloud sales data could not be loaded." });
  }
});

app.use("/api/products", productRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/payments", paymentRoutes);

const startServer = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB Atlas connected");
    const migratedCount = await migrateLegacyProducts();
    if (migratedCount) console.log(`Migrated ${migratedCount} legacy products to the unified schema`);
    app.listen(PORT, () => {
      console.log(`Vastra Sanvedan running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
