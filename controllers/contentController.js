const { ContentSection, Announcement, ContentPage } = require("../models/contentModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const { Product } = require("../models/productModel");

async function getHomepage(_req, res) {
  try {
    const [sections, announcements, categories, brands, products] = await Promise.all([
      ContentSection.find({ active: true }).populate("products").populate("brands").sort({ displayOrder: 1, createdAt: 1 }).lean(),
      Announcement.find({ active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
      Category.find({ active: true }).sort({ displayOrder: 1, name: 1 }).lean(),
      Brand.find({ active: true }).sort({ displayOrder: 1, name: 1 }).lean(),
      Product.find({ active: true }).sort({ sellingPrice: 1, createdAt: -1 }).lean(),
    ]);
    res.set("Cache-Control", "no-store").json({
      success: true,
      sections,
      announcements,
      categories,
      brands,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Homepage content could not be loaded." });
  }
}

async function listContent(_req, res) {
  const [sections, announcements, pages] = await Promise.all([
    ContentSection.find().sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Announcement.find().sort({ displayOrder: 1, createdAt: 1 }).lean(),
    ContentPage.find().sort({ slug: 1 }).lean(),
  ]);
  res.json({ success: true, sections, announcements, pages });
}

async function saveSection(req, res) {
  try {
    const data = { ...req.body };
    if (data._id) delete data._id;
    if (Array.isArray(data.products)) data.products = data.products.filter(Boolean);
    const section = req.params.id
      ? await ContentSection.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      : await ContentSection.create(data);
    res.status(req.params.id ? 200 : 201).json({ success: true, section });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteSection(req, res) {
  await ContentSection.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

async function saveAnnouncement(req, res) {
  try {
    const data = { ...req.body };
    if (data._id) delete data._id;
    const announcement = req.params.id
      ? await Announcement.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      : await Announcement.create(data);
    res.status(req.params.id ? 200 : 201).json({ success: true, announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteAnnouncement(req, res) {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

module.exports = { getHomepage, listContent, saveSection, deleteSection, saveAnnouncement, deleteAnnouncement };
