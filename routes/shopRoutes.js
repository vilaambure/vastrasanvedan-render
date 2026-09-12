const express = require("express");
const { listShopProducts, getShopProduct, listPublicCatalog, getPage, checkout, myOrders, myOrder } = require("../controllers/shopController");
const { getSettings } = require("../controllers/settingsController");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();
router.get("/products", listShopProducts);
router.get("/products/:id", getShopProduct);
router.get("/catalog", listPublicCatalog);
router.get("/pages/:slug", getPage);
router.get("/settings", getSettings);
router.post("/checkout", requireCustomer, checkout);
router.get("/orders", requireCustomer, myOrders);
router.get("/orders/:id", requireCustomer, myOrder);

module.exports = router;
