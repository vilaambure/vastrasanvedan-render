require("dotenv").config();

const mongoose = require("mongoose");
const { Product } = require("../models/productModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");
const { ContentSection, Announcement, ContentPage } = require("../models/contentModel");
const StoreSettings = require("../models/settingsModel");

const DEMO_PREFIX = "VS-DEMO";
const DEMO_MARKER = "[VS-DEMO-CONTENT]";
const image = (id, width = 900, height = 1125) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;

const images = [
  image("photo-1496747611176-843222e1e57c"), image("photo-1483985988355-763728e1935b"), image("photo-1525507119028-ed4c629a60a3"),
  image("photo-1490481651871-ab68de25d43d"), image("photo-1515886657613-9f3515b0c78f"), image("photo-1485968579580-b6d095142e6e"),
  image("photo-1539109136881-3be0616acf4b"), image("photo-1529139574466-a303027c1d8b"), image("photo-1509631179647-0177331693ae"),
  image("photo-1506629905607-d9b1a9d3f6f2"), image("photo-1517841905240-472988babdf9"), image("photo-1492562080023-ab3db95bfbce"),
];

const categorySeeds = [
  ["Women", "women", "WOMEN", 1, image("photo-1483985988355-763728e1935b", 900, 700)],
  ["Men", "men", "MEN", 2, image("photo-1516826957135-700dedea698c", 900, 700)],
  ["Kids", "kids", "KIDS", 3, image("photo-1503919545889-aef636e10ad4", 900, 700)],
  ["Sarees", "sarees", "WOMEN", 4, image("photo-1610030469983-98e550d6193c", 900, 700)],
  ["Kurtas", "kurtas", "WOMEN", 5, image("photo-1583391733956-6c78276477e2", 900, 700)],
  ["Shirts", "shirts", "MEN", 6, image("photo-1603252110481-7ba873bf42ab", 900, 700)],
  ["Dresses", "dresses", "WOMEN", 7, image("photo-1515372039744-b8f02a3ae446", 900, 700)],
  ["Bottoms", "bottoms", "OTHER", 8, image("photo-1541099649105-f69ad21f3246", 900, 700)],
  ["Accessories", "accessories", "OTHER", 9, image("photo-1523779917675-b6ed3a42a561", 900, 700)],
  ["Home Textiles", "home-textiles", "HOME", 10, image("photo-1584100936595-c0654b55a2e2", 900, 700)],
];

const brandNames = ["Aarohi Studio", "Indigo Loom", "Nazaakat", "Riwaayat", "The Loom Room", "Vastra Edit"];
const families = [
  ["Handwoven Cotton Kurta", "Kurtas", 1499, 999, "Handloom cotton with a relaxed cut for everyday elegance."],
  ["Printed A-line Dress", "Dresses", 2299, 1599, "A fluid silhouette with an easy day-to-evening finish."],
  ["Linen Resort Shirt", "Shirts", 1899, 1299, "Breathable linen blend made for slow weekends and warm days."],
  ["Indigo Straight Jeans", "Bottoms", 2499, 1799, "A comfortable straight fit with a clean indigo wash."],
  ["Chanderi Festive Saree", "Sarees", 3999, 2899, "Light-catching Chanderi weave for celebrations and intimate occasions."],
  ["Everyday Cotton Saree", "Sarees", 1799, 1199, "Soft cotton drape with a considered, modern border."],
  ["Block Print Co-ord Set", "Women", 2799, 1999, "A polished matching set finished with artisan block prints."],
  ["Relaxed Overshirt", "Men", 2199, 1499, "An overshirt layer with a soft hand feel and practical pockets."],
  ["Festive Nehru Jacket", "Men", 2999, 2199, "A tailored festive layer for weddings, dinners, and gatherings."],
  ["Mini Occasion Dress", "Kids", 1599, 999, "Playful occasion dressing made comfortable for all-day movement."],
  ["Silk Blend Cushion Cover", "Home Textiles", 899, 599, "A jewel-toned accent to bring craft and colour into your home."],
  ["Handcrafted Potli Bag", "Accessories", 1299, 799, "A small statement accessory with texture, beadwork, and character."],
];
const colours = ["Ivory", "Indigo", "Rose", "Sage", "Mustard", "Black", "Terracotta", "Sky Blue", "Wine", "Olive"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

function productData(family, index, categoryMap, brandMap) {
  const [familyName, categoryName, mrp, sellingPrice, description] = family;
  const colour = colours[index % colours.length];
  const brandName = brandNames[index % brandNames.length];
  const variantName = `${familyName} - ${colour}`;
  return {
    name: variantName,
    category: categoryName,
    categoryId: categoryMap.get(categoryName),
    brand: brandName,
    brandId: brandMap.get(brandName),
    description: `${description} This demo listing is part of the Vastra Sanvedan seasonal edit.`,
    details: `Designed in India | Variant ${String(index + 1).padStart(3, "0")} | ${DEMO_MARKER}`,
    material: index % 3 === 0 ? "100% cotton" : index % 3 === 1 ? "Cotton-linen blend" : "Viscose blend",
    careInstructions: "Gentle machine wash cold. Dry in shade. Iron on low heat.",
    deliveryInfo: "Demo delivery: ships in 2-4 business days. Easy returns within 7 days.",
    images: [images[index % images.length], images[(index + 3) % images.length]],
    mrp,
    sellingPrice,
    stock: 12 + (index % 29),
    sizes: categoryName === "Accessories" || categoryName === "Home Textiles" ? ["One Size"] : sizes.slice(0, 3 + (index % 4)),
    colors: [colour, colours[(index + 2) % colours.length]],
    barcode: `${DEMO_PREFIX}-${String(index + 1).padStart(4, "0")}`,
    active: true,
    newArrival: index < 36,
    featured: index % 5 === 0,
    trending: index % 3 === 0,
  };
}

async function upsertCategories() {
  const map = new Map();
  for (const [name, slug, group, displayOrder, categoryImage] of categorySeeds) {
    const category = await Category.findOneAndUpdate(
      { slug },
      { $set: { name, image: categoryImage, group, active: true, displayOrder } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();
    map.set(name, category._id);
  }
  return map;
}

async function upsertBrands() {
  const map = new Map();
  for (const [displayOrder, name] of brandNames.entries()) {
    const brand = await Brand.findOneAndUpdate(
      { name: `${DEMO_PREFIX} ${name}` },
      { $set: { name: `${DEMO_PREFIX} ${name}`, logo: images[(displayOrder + 5) % images.length], active: true, displayOrder } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();
    map.set(name, brand._id);
  }
  return map;
}

async function upsertProducts(categoryMap, brandMap) {
  const products = [];
  let index = 0;
  for (const family of families) {
    for (let variant = 0; variant < 10; variant += 1) {
      const data = productData(family, index, categoryMap, brandMap);
      data.brand = `${DEMO_PREFIX} ${data.brand}`;
      products.push(await Product.findOneAndUpdate(
        { barcode: data.barcode },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      ));
      index += 1;
    }
  }
  return products;
}

async function upsertContent(products, categoryMap, brandMap) {
  const productIds = products.map((product) => product._id);
  const brandIds = [...brandMap.values()];
  const sectionSeeds = [
    { type: "HERO", title: "The New Season Edit", subtitle: "Vastra Sanvedan | Autumn 2026", description: "Thoughtful clothing, crafted for the rhythm of everyday life.", image: image("photo-1496747611176-843222e1e57c", 1600, 900), mobileImage: image("photo-1496747611176-843222e1e57c", 900, 1200), ctaLabel: "Shop the edit", ctaUrl: "/shop", align: "left", displayOrder: 1 },
    { type: "CATEGORIES", title: "Shop by mood", subtitle: "Find your next favourite layer", categories: categorySeeds.slice(0, 8).map((item) => item[0]), displayOrder: 2 },
    { type: "PRODUCT_CAROUSEL", title: "New arrivals", subtitle: "Fresh pieces, just in", products: productIds.slice(0, 18), displayOrder: 3 },
    { type: "FULL_WIDTH_BANNER", title: "Crafted for your everyday", description: "Natural textures, expressive colour, and silhouettes that keep up.", image: image("photo-1490481651871-ab68de25d43d", 1600, 700), ctaLabel: "Explore clothing", ctaUrl: "/shop", displayOrder: 4 },
    { type: "BRANDS", title: "Labels worth knowing", subtitle: "Discover the studio edit", brands: brandIds, displayOrder: 5 },
    { type: "TRENDING", title: "Trending now", subtitle: "The pieces customers are loving", products: productIds.slice(30, 54), displayOrder: 6 },
    { type: "EDITORIAL", title: "A slower way to dress", subtitle: "Made with intention", description: "Meet the colours, textures, and craft stories behind this season's edit.", image: image("photo-1529139574466-a303027c1d8b", 1200, 900), ctaLabel: "Read our story", ctaUrl: "/about", align: "right", displayOrder: 7 },
    { type: "FEATURED", title: "The considered collection", subtitle: "Curated standouts for every wardrobe", products: productIds.slice(60, 84), displayOrder: 8 },
  ];
  for (const section of sectionSeeds) {
    await ContentSection.findOneAndUpdate(
      { type: section.type, title: section.title, description: { $regex: DEMO_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } },
      { $set: { ...section, description: `${section.description || ""} ${DEMO_MARKER}`.trim(), active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
  const announcements = [
    ["Free delivery on demo orders over ₹1,999", image("photo-1496747611176-843222e1e57c", 1000, 600), "/shop", 1],
    ["New season edit: soft layers and expressive colour", image("photo-1525507119028-ed4c629a60a3", 1000, 600), "/shop", 2],
    ["Easy returns within 7 days on eligible pieces", image("photo-1490481651871-ab68de25d43d", 1000, 600), "/legal", 3],
  ];
  for (const [text, announcementImage, link, displayOrder] of announcements) {
    await Announcement.findOneAndUpdate(
      { text: `${DEMO_MARKER} ${text}` },
      { $set: { text: `${DEMO_MARKER} ${text}`, image: announcementImage, link, active: true, displayOrder } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
  return sectionSeeds.length;
}

async function upsertPages() {
  const pages = [
    ["about", "About Vastra Sanvedan", "Vastra Sanvedan is a considered wardrobe for modern Indian living. We bring together expressive colour, honest materials, and small-batch craft from independent studios.\n\nThis demo page is part of the storefront preview content."],
    ["shipping", "Shipping & Delivery", "Demo orders are dispatched within 2-4 business days. Delivery timelines vary by location. You will receive tracking details when your order ships."],
    ["returns", "Returns & Exchanges", "Eligible products can be returned within 7 days of delivery in unused condition with original tags attached. Contact our support team to begin a return."],
    ["contact", "Contact Us", "For product questions, styling help, or order support, email hello@vastrasanvedan.com or message us on WhatsApp. We respond within one business day."],
    ["faqs", "Frequently Asked Questions", "How do I choose a size? Use the size information on each product page.\n\nAre these products available? Yes, all demo products shown are stocked for storefront testing.\n\nCan I return an item? Eligible items can be returned within 7 days."],
    ["legal", "Store Policies", "This is a demo storefront populated for experience testing. Prices, delivery information, and availability are sample values."],
  ];
  for (const [slug, title, body] of pages) {
    await ContentPage.findOneAndUpdate({ slug }, { $set: { title, body } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
  }
}

async function upsertSettings() {
  await StoreSettings.findOneAndUpdate(
    { key: "store" },
    { $set: {
      storeName: "Vastra Sanvedan",
      tagline: "Thoughtful clothing for everyday rituals.",
      announcementText: "New season edit now live | Free delivery over ₹1,999",
      contactPhone: "+91 99999 99999",
      contactEmail: "hello@vastrasanvedan.com",
      footerText: "Curated wardrobe from the atelier.",
      productPageTitle: "The considered edit",
      heroButtonText: "Explore the collection",
      heroButtonLink: "/shop",
      primaryColor: "#1c1814",
      accentColor: "#d9c3a0",
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from .env");
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const categoryMap = await upsertCategories();
    const brandMap = await upsertBrands();
    const products = await upsertProducts(categoryMap, brandMap);
    const sections = await upsertContent(products, categoryMap, brandMap);
    await upsertPages();
    await upsertSettings();
    console.log(`Demo storefront ready: ${products.length} products, ${categoryMap.size} categories, ${brandMap.size} brands, ${sections} homepage sections, 3 banners, 6 pages.`);
    console.log(`Demo products use barcode prefix ${DEMO_PREFIX}; real catalogue records were not deleted.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Demo storefront seed failed:", error.message);
  process.exitCode = 1;
});
