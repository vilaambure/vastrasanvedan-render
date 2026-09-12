const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { salesAnalytics } = require("../controllers/productController");
const { Product } = require("../models/productModel");
const {
  listCategories,
  saveCategory,
  deleteCategory,
  listBrands,
  saveBrand,
  deleteBrand,
  saveProduct,
  deleteProduct,
  setProductActive,
  savePage,
  listPages,
} = require("../controllers/adminController");
const { listContent, saveSection, deleteSection, saveAnnouncement, deleteAnnouncement } = require("../controllers/contentController");
const { getSettings, saveSettings } = require("../controllers/settingsController");
const { listCustomers, getCustomer, setBlocked } = require("../controllers/customerController");
const { listOrders, getOrder, updateOrderStatus, verifyPayment, markPaymentFailed } = require("../controllers/orderAdminController");
const AuditEvent = require("../models/auditModel");

const router = express.Router();
router.use(requireAdmin);

router.get("/content", listContent);
router.get("/settings", getSettings);
router.put("/settings", saveSettings);
router.post("/content/sections", saveSection);
router.put("/content/sections/:id", saveSection);
router.delete("/content/sections/:id", deleteSection);
router.post("/content/announcements", saveAnnouncement);
router.put("/content/announcements/:id", saveAnnouncement);
router.delete("/content/announcements/:id", deleteAnnouncement);
router.get("/pages", listPages);
router.put("/pages/:slug", savePage);

router.get("/sales-analytics", salesAnalytics);
router.get("/products", async (_req, res) => res.json({ success: true, products: await Product.find().sort({ updatedAt: -1 }).lean() }));
router.post("/products", saveProduct);
router.put("/products/:id", saveProduct);
router.delete("/products/:id", deleteProduct);
router.patch("/products/:id/active", setProductActive);

router.get("/categories", listCategories);
router.post("/categories", saveCategory);
router.put("/categories/:id", saveCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/brands", listBrands);
router.post("/brands", saveBrand);
router.put("/brands/:id", saveBrand);
router.delete("/brands/:id", deleteBrand);

router.get("/orders", listOrders);
router.get("/orders/:id", getOrder);
router.patch("/orders/:id/status", updateOrderStatus);
router.post("/orders/:id/verify-payment", verifyPayment);
router.post("/orders/:id/fail-payment", markPaymentFailed);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomer);
router.post("/customers/:id/block", setBlocked);

router.get("/audit", async (_req, res) => res.json({ success: true, events: await AuditEvent.find().sort({ createdAt: -1 }).limit(100).lean() }));

module.exports = router;
