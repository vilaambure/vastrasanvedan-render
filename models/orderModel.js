const mongoose = require("mongoose");
const { ORDER_STATUSES, PAYMENT_STATES } = require("../lib/orderConstants");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    size: { type: String, default: "", trim: true },
    color: { type: String, default: "", trim: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    barcode: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    orderType: { type: String, enum: ["POS_OFFLINE", "WEB_ONLINE"], required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customer: {
      name: { type: String, default: "Walk-in Customer", trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      district: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
      pincode: { type: String, default: "", trim: true },
    },
    items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ["CASH", "UPI", "CARD"], required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATES, default: "PENDING" },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: "PLACED" },
    statusHistory: { type: [statusHistorySchema], default: [] },
    payment: {
      provider: { type: String, default: "", trim: true },
      providerTransactionId: { type: String, default: "", trim: true },
      expectedAmount: { type: Number, default: 0, min: 0 },
      receivedAmount: { type: Number, default: null },
      reference: { type: String, default: "", trim: true },
      verifiedAt: { type: Date, default: null },
      notes: { type: String, default: "", trim: true },
      webhookReceivedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model("Order", orderSchema);
