const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const { Product } = require("../models/productModel");
const { ContentPage } = require("../models/contentModel");
const { normalizeProduct } = require("./productController");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `item-${Date.now()}`;
}

async function listCategories(_req, res) {
  res.json({ success: true, categories: await Category.find().sort({ displayOrder: 1, name: 1 }).lean() });
}

async function saveCategory(req, res) {
  try {
    const data = {
      name: String(req.body?.name || "").trim(),
      slug: slugify(req.body?.slug || req.body?.name),
      image: String(req.body?.image || ""),
      group: ["MEN", "WOMEN", "KIDS", "HOME", "OTHER"].includes(req.body?.group) ? req.body.group : "OTHER",
      active: req.body?.active !== false,
      displayOrder: Number(req.body?.displayOrder || 0),
    };
    if (!data.name) return res.status(400).json({ success: false, message: "Category name is required." });
    const category = req.params.id
      ? await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      : await Category.create(data);
    res.status(req.params.id ? 200 : 201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: "Category could not be saved." });
  }
}

async function deleteCategory(req, res) {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

async function listBrands(_req, res) {
  res.json({ success: true, brands: await Brand.find().sort({ displayOrder: 1, name: 1 }).lean() });
}

async function saveBrand(req, res) {
  try {
    const data = {
      name: String(req.body?.name || "").trim(),
      logo: String(req.body?.logo || ""),
      active: req.body?.active !== false,
      displayOrder: Number(req.body?.displayOrder || 0),
    };
    if (!data.name) return res.status(400).json({ success: false, message: "Brand name is required." });
    const brand = req.params.id
      ? await Brand.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      : await Brand.create(data);
    res.status(req.params.id ? 200 : 201).json({ success: true, brand });
  } catch (error) {
    res.status(400).json({ success: false, message: "Brand could not be saved." });
  }
}

async function deleteBrand(req, res) {
  await Brand.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

async function saveProduct(req, res) {
  try {
    const data = normalizeProduct(req.body);
    if (!data.barcode) delete data.barcode;
    let product;
    if (req.params.id && mongoose.isValidObjectId(req.params.id)) {
      product = await Product.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
      if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    } else {
      product = await Product.create(data);
    }
    res.status(req.params.id ? 200 : 201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, message: "Product deleted permanently." });
  } catch (error) {
    res.status(400).json({ success: false, message: "Product could not be deleted." });
  }
}

async function setProductActive(req, res) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: { active: Boolean(req.body?.active) } }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: "Product could not be updated." });
  }
}

async function savePage(req, res) {
  try {
    const slug = String(req.body?.slug || req.params.slug || "").toLowerCase().trim();
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "");
    if (!slug || !title) return res.status(400).json({ success: false, message: "Page slug and title are required." });
    const page = await ContentPage.findOneAndUpdate({ slug }, { $set: { slug, title, body } }, { upsert: true, new: true });
    res.json({ success: true, page });
  } catch (error) {
    res.status(400).json({ success: false, message: "Page could not be saved." });
  }
}

async function listPages(_req, res) {
  res.json({ success: true, pages: await ContentPage.find().sort({ slug: 1 }).lean() });
}

module.exports = {
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
};
