const express = require("express");
const { pullChanges, pushAndPullSync, createOrder } = require("../controllers/productController");
const { Product } = require("../models/productModel");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/search", requireAdmin, async (req, res) => {
  try {
    const barcode = String(req.query.barcode || "").trim();
    const query = String(req.query.q || "").trim();
    if (!barcode && !query) return res.status(400).json({ success: false, message: "Search text or barcode is required" });
    if (barcode) {
      const product = await Product.findOne({ barcode }).lean();
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      return res.json({ success: true, product, products: [product] });
    }
    const safeQuery = escapeRegex(query);
    const conditions = [
      { name: { $regex: safeQuery, $options: "i" } },
      { barcode: { $regex: safeQuery, $options: "i" } },
      { category: { $regex: safeQuery, $options: "i" } },
      { brand: { $regex: safeQuery, $options: "i" } },
    ];
    if (/^[a-f\d]{24}$/i.test(query)) conditions.push({ _id: query });
    const products = await Product.find({ $or: conditions }).sort({ active: -1, name: 1 }).limit(12).lean();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Product lookup failed." });
  }
});

router.get("/sync", requireAdmin, pullChanges);
router.post("/sync", requireAdmin, pushAndPullSync);
router.post("/orders", requireAdmin, createOrder);

module.exports = router;
