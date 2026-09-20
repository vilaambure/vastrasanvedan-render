const Order = require("../models/orderModel");
const StoreSettings = require("../models/settingsModel");
const AuditEvent = require("../models/auditModel");
const { ORDER_STATUSES, amountsMatch, roundMoney } = require("../lib/orderConstants");

async function listOrders(req, res) {
  const filter = {};
  if (req.query.type) filter.orderType = req.query.type;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, orders });
}

async function getOrder(req, res) {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  res.json({ success: true, order });
}

async function updateOrderStatus(req, res) {
  try {
    const status = String(req.body?.status || "").toUpperCase();
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid order status." });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    order.orderStatus = status;
    order.statusHistory.push({ status, at: new Date(), note: String(req.body?.note || "").trim() });
    await order.save();
    await AuditEvent.create({
      actor: "admin",
      action: "ORDER_STATUS_UPDATED",
      targetType: "Order",
      targetId: String(order._id),
      details: `${order.invoiceNumber} -> ${status}${req.body?.note ? ` · ${String(req.body.note).trim()}` : ""}`,
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: "Order could not be updated." });
  }
}

async function verifyPayment(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    const receivedAmount = roundMoney(req.body?.receivedAmount);
    const reference = String(req.body?.reference || "").trim();
    const expected = roundMoney(order.payment?.expectedAmount || order.totalAmount);
    const settings = await StoreSettings.findOne({ key: "store" }).lean();
    const autoConfirm = settings?.autoConfirmVerifiedPayments !== false;

    order.payment = {
      expectedAmount: expected,
      receivedAmount,
      reference,
      verifiedAt: new Date(),
      notes: String(req.body?.notes || "").trim(),
    };

    if (!Number.isFinite(receivedAmount) || receivedAmount < 0) {
      return res.status(400).json({ success: false, message: "Received amount is required." });
    }

    if (amountsMatch(expected, receivedAmount)) {
      order.paymentStatus = "VERIFIED";
      if (autoConfirm && order.orderStatus === "PLACED") {
        order.orderStatus = "CONFIRMED";
        order.statusHistory.push({ status: "CONFIRMED", at: new Date(), note: "Auto-confirmed after verified payment." });
      }
    } else {
      order.paymentStatus = "MISMATCH";
      order.payment.notes = `${order.payment.notes} Amount mismatch: expected ${expected}, received ${receivedAmount}`.trim();
    }

    await order.save();
    await AuditEvent.create({
      actor: "admin",
      action: "PAYMENT_REVIEW",
      targetType: "Order",
      targetId: String(order._id),
      details: `${order.paymentStatus} · expected ${expected} · received ${receivedAmount}`,
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: "Payment could not be reviewed." });
  }
}

async function markPaymentFailed(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  order.paymentStatus = "FAILED";
  order.payment.notes = String(req.body?.notes || "Marked failed by admin").trim();
  await order.save();
  res.json({ success: true, order });
}

module.exports = { listOrders, getOrder, updateOrderStatus, verifyPayment, markPaymentFailed };
