const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, default: "" },
    googleId: { type: String, trim: true, sparse: true, unique: true },
    addresses: { type: [addressSchema], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    blocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockedReason: { type: String, default: "" },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model("Customer", customerSchema);
