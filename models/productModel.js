const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    brand: { type: String, default: "", trim: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null },
    description: { type: String, default: "", trim: true },
    details: { type: String, default: "", trim: true },
    material: { type: String, default: "", trim: true },
    careInstructions: { type: String, default: "", trim: true },
    deliveryInfo: { type: String, default: "", trim: true },
    images: { type: [String], default: [] },
    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 0, min: 0 },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    barcode: { type: String, default: undefined, unique: true, sparse: true, index: true, trim: true },
    active: { type: Boolean, default: true },
    newArrival: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true }
);

productSchema.pre("validate", function (next) {
  this.discount = this.mrp > 0 ? Math.max(0, Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100)) : 0;
  next();
});

const syncOpSchema = new mongoose.Schema(
  {
    opId: { type: String, required: true, unique: true },
    type: { type: String, enum: ["upsert", "delete"], required: true },
    deviceId: { type: String, required: true },
    status: { type: String, enum: ["applied", "skipped"], default: "applied" },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
const SyncOp = mongoose.model("SyncOp", syncOpSchema);

module.exports = { Product, SyncOp };
