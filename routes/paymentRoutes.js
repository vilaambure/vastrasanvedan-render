const express = require("express");
const crypto = require("crypto");
const Order = require("../models/orderModel");
const StoreSettings = require("../models/settingsModel");
const { roundMoney, amountsMatch } = require("../lib/orderConstants");

const router = express.Router();

function verifyProviderSignature(payload, secret, signature) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.replace(/^sha256=/, "")));
}

async function createPaymentIntent(req, res) {
  try {
    const orderId = String(req.body?.orderId || "").trim();
    const amount = roundMoney(req.body?.amount || 0);
    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid orderId and amount are required." });
    }
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    const settings = await StoreSettings.findOne({ key: "store" }).lean();
    const provider = settings?.paymentProvider || process.env.PAYMENT_PROVIDER || "manual";
    const merchantId = settings?.paymentGatewayMerchantId || process.env.PAYMENT_GATEWAY_MERCHANT_ID || "";
    res.json({
      success: true,
      paymentIntent: {
        provider,
        orderId: String(order._id),
        amount: Number(order.payment?.expectedAmount || order.totalAmount || amount),
        merchantId,
        mode: "UPI",
        status: "REQUESTED",
        instructions: provider === "manual" || !merchantId
          ? "No live gateway credentials are configured. The order remains PAYMENT_PENDING until admin verification."
          : "Gateway integration is ready for server-side verification and webhook callbacks.",
      },
    });
  } catch (_error) {
    res.status(500).json({ success: false, message: "Payment request could not be created." });
  }
}

async function paymentWebhook(req, res) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || (await StoreSettings.findOne({ key: "store" }).lean())?.paymentWebhookSecret || "";
    const signature = String(req.headers["x-signature"] || req.headers["x-webhook-signature"] || req.headers["x-paytm-signature"] || "");
    const body = raw ? JSON.parse(raw) : {};
    if (secret && signature && !verifyProviderSignature(raw, secret, signature)) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature." });
    }
    const orderId = String(body.orderId || body.order_id || body.reference || body.data?.orderId || "").trim();
    const transactionId = String(body.transactionId || body.transaction_id || body.referenceId || body.data?.transactionId || "").trim();
    const paidAmount = Number(body.amount || body.totalAmount || body.data?.amount || 0);
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    const expected = Number(order.payment?.expectedAmount || order.totalAmount || 0);
    const verified = amountsMatch(expected, paidAmount) && (body.status === "SUCCESS" || body.status === "PAID" || body.state === "SUCCESS");
    if (!verified) {
      order.paymentStatus = "MISMATCH";
      order.payment.mismatchReason = "Verified payment did not match the expected amount.";
      order.payment.receivedAmount = paidAmount;
      order.payment.provider = String(body.provider || "gateway").trim();
      order.payment.providerTransactionId = transactionId;
      order.payment.webhookReceivedAt = new Date();
      await order.save();
      return res.json({ success: true, status: "MISMATCH", message: "Payment requires review." });
    }
    order.paymentStatus = "VERIFIED";
    order.payment.receivedAmount = paidAmount;
    order.payment.reference = transactionId || order.payment.reference;
    order.payment.provider = String(body.provider || "gateway").trim();
    order.payment.providerTransactionId = transactionId;
    order.payment.verifiedAt = new Date();
    order.payment.webhookReceivedAt = new Date();
    if (order.orderStatus === "PLACED") {
      const settings = await StoreSettings.findOne({ key: "store" }).lean();
      const shouldAutoConfirm = settings?.autoConfirmVerifiedPayments !== false;
      if (shouldAutoConfirm) {
        order.orderStatus = "CONFIRMED";
        order.statusHistory.push({ status: "CONFIRMED", at: new Date(), note: "Auto-confirmed after verified payment webhook." });
      }
    }
    await order.save();
    res.json({ success: true, status: "VERIFIED", message: "Payment verified and recorded." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Webhook could not be processed." });
  }
}

router.post("/payment-intent", createPaymentIntent);
router.post("/webhook", paymentWebhook);

module.exports = router;
