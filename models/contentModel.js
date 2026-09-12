const mongoose = require("mongoose");

const SECTION_TYPES = [
  "HERO",
  "HERO_CAMPAIGN",
  "CATEGORIES",
  "CATEGORY_SHOWCASE",
  "BRANDS",
  "LOWEST_PRICE",
  "PRODUCT_CAROUSEL",
  "PRODUCT_GRID",
  "PRODUCT_RAIL",
  "FULL_WIDTH_BANNER",
  "VIDEO",
  "COLLECTION",
  "LOOKBOOK",
  "EDITORIAL",
  "EDITORIAL_STORY",
  "PROMO_STRIP",
  "PROMOTIONAL_STRIP",
  "NEW_ARRIVALS",
  "TRENDING",
  "FEATURED",
  "SPLIT_STORY",
  "BRAND_STORY",
];

const contentSectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SECTION_TYPES, required: true },
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    mobileImage: { type: String, default: "", trim: true },
    videoUrl: { type: String, default: "", trim: true },
    posterImage: { type: String, default: "", trim: true },
    ctaLabel: { type: String, default: "", trim: true },
    ctaUrl: { type: String, default: "", trim: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    categories: { type: [String], default: [] },
    brands: [{ type: mongoose.Schema.Types.ObjectId, ref: "Brand" }],
    align: { type: String, enum: ["left", "center", "right"], default: "left" },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const announcementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    image: { type: String, default: "", trim: true },
    link: { type: String, default: "" },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = {
  ContentSection: mongoose.model("ContentSection", contentSectionSchema),
  Announcement: mongoose.model("Announcement", announcementSchema),
  ContentPage: mongoose.model("ContentPage", pageSchema),
  SECTION_TYPES,
};
