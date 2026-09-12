const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    image: { type: String, default: "" },
    group: {
      type: String,
      enum: ["MEN", "WOMEN", "KIDS", "HOME", "OTHER"],
      default: "OTHER",
    },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
