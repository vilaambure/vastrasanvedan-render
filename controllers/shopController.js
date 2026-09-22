const { Product } = require("../models/productModel");
const { createOrder, normalizeProduct } = require("./productController");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const Order = require("../models/orderModel");
const { ContentPage } = require("../models/contentModel");

function publicProduct(product) {
  return { ...product, ...normalizeProduct(product) };
}

async function listShopProducts(req, res) {
  try {
    const query = { $or: [{ active: true }, { active: { $exists: false }, isDeleted: { $ne: true } }] };
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const brand = String(req.query.brand || "").trim();
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (q) {
      const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = new RegExp(safeQuery, "i");
      query.$and = [{ $or: [{ name: expression }, { category: expression }, { brand: expression }, { barcode: expression }] }];
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (Number.isFinite(minPrice)) query.sellingPrice = { ...(query.sellingPrice || {}), $gte: minPrice };
    if (Number.isFinite(maxPrice)) query.sellingPrice = { ...(query.sellingPrice || {}), $lte: maxPrice };
    const products = await Product.find(query).sort({ newArrival: -1, createdAt: -1 }).lean();
    res.set("Cache-Control", "no-store").json({ success: true, products: products.map(publicProduct) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Catalog could not be loaded." });
  }
}

async function getShopProduct(req, res) {
  try {
    const product = await Product.findOne({ _id: req.params.id, active: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, product: publicProduct(product) });
  } catch (error) {
    res.status(404).json({ success: false, message: "Product not found." });
  }
}

async function listPublicCatalog(_req, res) {
  try {
    const [categories, brands] = await Promise.all([
      Category.find({ active: true }).sort({ displayOrder: 1, name: 1 }).lean(),
      Brand.find({ active: true }).sort({ displayOrder: 1, name: 1 }).lean(),
    ]);
    res.json({ success: true, categories, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: "Catalog could not be loaded." });
  }
}

async function getPage(req, res) {
  try {
    const page = await ContentPage.findOne({ slug: String(req.params.slug || "").toLowerCase() }).lean();
    if (!page) return res.status(404).json({ success: false, message: "Page not found." });
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: "Page could not be loaded." });
  }
}

function checkout(req, res) {
  req.body = { ...req.body, orderType: "WEB_ONLINE", paymentMode: "UPI" };
  return createOrder(req, res);
}

async function myOrders(req, res) {
  try {
    const orders = await Order.find({ customerId: req.customerId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Orders could not be loaded." });
  }
}

async function myOrder(req, res) {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.customerId }).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    res.json({ success: true, order });
  } catch (error) {
    res.status(404).json({ success: false, message: "Order not found." });
  }
}

module.exports = { listShopProducts, getShopProduct, listPublicCatalog, getPage, checkout, myOrders, myOrder };
