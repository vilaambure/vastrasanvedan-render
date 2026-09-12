const mongoose = require("mongoose");
const crypto = require("crypto");
const { Product, SyncOp } = require("../models/productModel");
const Order = require("../models/orderModel");
const Customer = require("../models/customerModel");
const StoreSettings = require("../models/settingsModel");
const { ORDER_STATUSES, PAYMENT_STATES, WEB_PAYMENTS, POS_PAYMENTS, roundMoney } = require("../lib/orderConstants");

function parseSince(value) {
  if (!value) return new Date(0);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePayment(value, allowed) {
  const payment = String(value || "").toUpperCase();
  return allowed.includes(payment) ? payment : null;
}

function normalizeProduct(data = {}) {
  const legacySizes = Array.isArray(data.sizes) ? data.sizes : [];
  const sizes = legacySizes.map((size) => (typeof size === "string" ? size : size.size)).filter(Boolean);
  const stock = data.stock ?? legacySizes.reduce((sum, size) => sum + Number(size.stock || 0), 0);
  const images = Array.isArray(data.images) ? data.images : data.image ? [data.image] : [];
  const mrp = Number(data.mrp ?? data.price ?? data.sellingPrice ?? 0);
  const sellingPrice = Number(data.sellingPrice ?? data.price ?? mrp);
  const categoryId = data.categoryId && mongoose.isValidObjectId(data.categoryId) ? data.categoryId : null;
  const brandId = data.brandId && mongoose.isValidObjectId(data.brandId) ? data.brandId : null;
  return {
    name: String(data.name || "Untitled product").trim(),
    category: String(data.category || "General").trim(),
    categoryId,
    brand: String(data.brand || "").trim(),
    brandId,
    description: String(data.description || "").trim(),
    details: String(data.details || "").trim(),
    material: String(data.material || "").trim(),
    careInstructions: String(data.careInstructions || "").trim(),
    deliveryInfo: String(data.deliveryInfo || "").trim(),
    images,
    mrp,
    sellingPrice,
    stock: Math.max(0, Number(stock) || 0),
    sizes,
    colors: Array.isArray(data.colors) ? data.colors : [],
    barcode: String(data.barcode || "").trim() || undefined,
    active: data.active ?? !data.isDeleted,
    newArrival: Boolean(data.newArrival),
    featured: Boolean(data.featured),
    trending: Boolean(data.trending),
  };
}

async function migrateLegacyProducts() {
  try {
    await Product.collection.dropIndex("barcode_1");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") throw error;
  }
  await Product.collection.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: "barcode_1" });
  const legacyProducts = await Product.collection.find({ sellingPrice: { $exists: false } }).toArray();
  for (const legacy of legacyProducts) {
    const normalized = normalizeProduct({ ...legacy, barcode: legacy.barcode || "" });
    await Product.collection.updateOne(
      { _id: legacy._id },
      { $set: normalized, $unset: { price: "", image: "", isDeleted: "", localId: "", deviceId: "" } }
    );
  }
  await Order.collection.updateMany({ orderStatus: "COMPLETED" }, { $set: { orderStatus: "DELIVERED" } });
  await Order.collection.updateMany({ orderStatus: "PENDING_DISPATCH" }, { $set: { orderStatus: "PLACED" } });
  await Order.collection.updateMany({ paymentStatus: "PAID" }, { $set: { paymentStatus: "VERIFIED" } });
  try {
    await Order.collection.updateMany(
      { "payment.expectedAmount": { $exists: false } },
      [{ $set: { payment: { expectedAmount: "$totalAmount", receivedAmount: null, reference: "", verifiedAt: null, notes: "" } } }]
    );
  } catch (_error) {
    const pending = await Order.collection.find({ "payment.expectedAmount": { $exists: false } }).toArray();
    for (const order of pending) {
      await Order.collection.updateOne({ _id: order._id }, { $set: { "payment.expectedAmount": order.totalAmount || 0 } });
    }
  }
  return legacyProducts.length;
}

async function applyUpsert(op, deviceId) {
  const data = op.product || op.payload || {};
  const normalized = normalizeProduct(data);
  const query =
    data._id && mongoose.isValidObjectId(data._id)
      ? { _id: data._id }
      : normalized.barcode
        ? { barcode: normalized.barcode }
        : { _id: new mongoose.Types.ObjectId() };
  const product = await Product.findOneAndUpdate(query, { $set: normalized }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
  await SyncOp.create({ opId: op.opId, type: "upsert", deviceId, status: "applied" });
  return { status: "applied", product };
}

async function applyDelete(op, deviceId) {
  const data = op.product || op.payload || {};
  const query = data._id && mongoose.isValidObjectId(data._id) ? { _id: data._id } : { barcode: data.barcode };
  const product = await Product.findOneAndUpdate(query, { $set: { active: false } }, { new: true });
  await SyncOp.create({ opId: op.opId, type: "delete", deviceId, status: product ? "applied" : "skipped" });
  return { status: product ? "applied" : "skipped", product };
}

function customerSnapshot(source = {}, account = null) {
  return {
    name: String(source.name || account?.name || "Walk-in Customer").trim(),
    email: String(source.email || account?.email || "").trim().toLowerCase(),
    phone: String(source.phone || account?.phone || "").trim(),
    address: String(source.address || "").trim(),
    city: String(source.city || "").trim(),
    district: String(source.district || "").trim(),
    state: String(source.state || "").trim(),
    pincode: String(source.pincode || "").trim(),
  };
}

async function createOrder(req, res) {
  const session = await mongoose.startSession();
  try {
    const body = req.body || {};
    const orderType = body.orderType === "WEB_ONLINE" ? "WEB_ONLINE" : "POS_OFFLINE";
    const isWeb = orderType === "WEB_ONLINE";
    const allowedPayments = isWeb ? WEB_PAYMENTS : POS_PAYMENTS;
    const paymentMode = normalizePayment(body.paymentMode, allowedPayments);
    if (!paymentMode) {
      return res.status(400).json({ success: false, message: isWeb ? "Online checkout accepts UPI only." : "POS payment must be CASH, UPI or CARD." });
    }

    let account = null;
    if (isWeb) {
      if (!req.customerId) return res.status(401).json({ success: false, message: "Please sign in to checkout." });
      account = await Customer.findById(req.customerId).lean();
      if (!account) return res.status(401).json({ success: false, message: "Please sign in to checkout." });
      if (account.blocked) return res.status(403).json({ success: false, message: "This account cannot place new orders." });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) return res.status(400).json({ success: false, message: "At least one item is required." });

    const invoiceNumber = String(body.invoiceNumber || `VASTRA-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`).toUpperCase();
    const productIds = rawItems.map((item) => item.productId);
    if (productIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: "Every item needs a valid productId." });
    }

    const customer = customerSnapshot(body.customer || {
      name: body.customerName,
      phone: body.phoneNumber,
      address: body.address,
      city: body.city,
      district: body.district,
      state: body.state,
      pincode: body.pincode,
    }, account);

    if (isWeb && (!customer.name || !customer.phone || !customer.address || !customer.city || !customer.state || !/^\d{6}$/.test(customer.pincode))) {
      return res.status(400).json({ success: false, message: "Complete delivery details are required." });
    }

    let created;
    await session.withTransaction(async () => {
      if (await Order.exists({ invoiceNumber }).session(session)) throw new Error("Invoice number already exists");
      const products = await Product.find({ _id: { $in: productIds }, ...(isWeb ? { active: true } : {}) }).session(session).lean();
      const productMap = new Map(products.map((product) => [String(product._id), product]));
      const cleanItems = [];

      for (const rawItem of rawItems) {
        const product = productMap.get(String(rawItem.productId));
        const qty = Number(rawItem.qty ?? rawItem.quantity);
        if (!product || !Number.isInteger(qty) || qty < 1) throw new Error("Invalid product or quantity");
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, ...(isWeb ? { active: true } : {}), stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true, session }
        );
        if (!updated) throw new Error(`${product.name} is out of stock`);
        cleanItems.push({
          productId: product._id,
          name: product.name,
          size: rawItem.size || "",
          color: rawItem.color || "",
          qty,
          price: product.sellingPrice,
          barcode: product.barcode || "",
        });
      }

      const totalAmount = roundMoney(cleanItems.reduce((sum, item) => sum + item.price * item.qty, 0));
      const orderStatus = isWeb ? "PLACED" : "DELIVERED";
      const paymentStatus = isWeb ? "PENDING" : "VERIFIED";
      created = (await Order.create([{
        invoiceNumber,
        orderType,
        customerId: account?._id || null,
        customer,
        items: cleanItems,
        totalAmount,
        paymentMode,
        paymentStatus,
        orderStatus,
        statusHistory: [{ status: orderStatus, at: new Date(), note: isWeb ? "Order placed, awaiting payment verification." : "POS sale collected in store." }],
        payment: {
          expectedAmount: totalAmount,
          receivedAmount: isWeb ? null : totalAmount,
          reference: isWeb ? String(body.paymentReference || "").trim() : `POS-${invoiceNumber}`,
          verifiedAt: isWeb ? null : new Date(),
        },
      }], { session }))[0];
    });

    res.status(201).json({
      success: true,
      message: isWeb ? "Order placed. Payment will be verified before confirmation." : "Order created successfully",
      invoiceNumber,
      orderId: created?._id,
      totalAmount: created?.totalAmount,
      paymentStatus: created?.paymentStatus,
      orderStatus: created?.orderStatus,
    });
  } catch (error) {
    res.status(error.message === "Invoice number already exists" ? 409 : 400).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
}

async function pullChanges(req, res) {
  try {
    const since = parseSince(req.query.since);
    if (!since) return res.status(400).json({ success: false, message: "Invalid since timestamp" });
    const products = await Product.find({ updatedAt: { $gt: since } }).sort({ updatedAt: 1 }).lean();
    res.json({ success: true, serverTime: new Date().toISOString(), products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Catalog could not be synced." });
  }
}

async function pushAndPullSync(req, res) {
  try {
    const { deviceId, operations, since } = req.body || {};
    if (!deviceId || !Array.isArray(operations)) return res.status(400).json({ success: false, message: "deviceId and operations[] are required" });
    const sinceDate = parseSince(since);
    if (!sinceDate) return res.status(400).json({ success: false, message: "Invalid since timestamp" });
    const results = [];
    for (const op of operations) {
      if (!op?.opId || !op?.type || (await SyncOp.exists({ opId: op.opId }))) {
        results.push({ opId: op?.opId, status: "skipped" });
        continue;
      }
      results.push({ opId: op.opId, ...(op.type === "delete" ? await applyDelete(op, deviceId) : await applyUpsert(op, deviceId)) });
    }
    const products = await Product.find({ updatedAt: { $gt: sinceDate } }).sort({ updatedAt: 1 }).lean();
    res.json({ success: true, results, serverTime: new Date().toISOString(), products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Catalog could not be synced." });
  }
}

async function salesAnalytics(req, res) {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const monthStart = new Date(to.getFullYear(), to.getMonth(), 1);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  try {
    const matchRange = { createdAt: { $gte: from, $lte: to } };
    const [
      summary,
      unitSummary,
      todaySummary,
      monthSummary,
      byType,
      byPayment,
      productSales,
      categorySales,
      recentOrders,
      daily,
      lowStock,
      productCount,
      customerCount,
    ] = await Promise.all([
      Order.aggregate([{ $match: matchRange }, { $group: { _id: null, turnover: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]),
      Order.aggregate([{ $match: matchRange }, { $unwind: "$items" }, { $group: { _id: null, units: { $sum: "$items.qty" } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: todayStart, $lte: to } } }, { $group: { _id: null, turnover: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: monthStart, $lte: to } } }, { $group: { _id: null, turnover: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]),
      Order.aggregate([{ $match: matchRange }, { $group: { _id: "$orderType", revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]),
      Order.aggregate([{ $match: matchRange }, { $group: { _id: "$paymentMode", revenue: { $sum: "$totalAmount" } } }]),
      Order.aggregate([{ $match: matchRange }, { $unwind: "$items" }, { $group: { _id: "$items.productId", name: { $first: "$items.name" }, qty: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } }, { $sort: { revenue: -1 } }, { $limit: 20 }]),
      Order.aggregate([
        { $match: matchRange },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$product.category", qty: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Order.find(matchRange).sort({ createdAt: -1 }).limit(20).lean(),
      Order.aggregate([
        { $match: matchRange },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.countDocuments({ stock: { $lt: 5 } }),
      Product.countDocuments(),
      Customer.countDocuments(),
    ]);
    const turnover = summary[0]?.turnover || 0;
    const orders = summary[0]?.orders || 0;
    res.json({
      success: true,
      summary: {
        turnover,
        orders,
        units: unitSummary[0]?.units || 0,
        averageOrderValue: orders ? roundMoney(turnover / orders) : 0,
        todayRevenue: todaySummary[0]?.turnover || 0,
        todayOrders: todaySummary[0]?.orders || 0,
        monthlyRevenue: monthSummary[0]?.turnover || 0,
        monthlyOrders: monthSummary[0]?.orders || 0,
        lowStock,
        productCount,
        customerCount,
      },
      byType,
      byPayment,
      productSales,
      categorySales,
      recentOrders,
      daily,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Analytics could not be loaded." });
  }
}

function isValidStatus(status) {
  return ORDER_STATUSES.includes(status);
}

function isValidPaymentState(status) {
  return PAYMENT_STATES.includes(status);
}

async function getStoreSettings() {
  return StoreSettings.findOne({ key: "store" }).lean();
}

module.exports = {
  pullChanges,
  pushAndPullSync,
  createOrder,
  salesAnalytics,
  normalizeProduct,
  migrateLegacyProducts,
  isValidStatus,
  isValidPaymentState,
  getStoreSettings,
  customerSnapshot,
};
