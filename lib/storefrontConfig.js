const DEFAULT_STORE_CONFIG = {
  storeName: "Vastra Sanvedan",
  tagline: "Clothes with a point of view.",
  primaryColor: "#1c1814",
  accentColor: "#d9c3a0",
  backgroundColor: "#f4efe8",
  surfaceColor: "#fbf8f3",
  textColor: "#1c1814",
  headingColor: "#faf8f5",
  bodyColor: "#fffdf9",
  brandColor: "#d4af37",
  buttonColor: "#d4af37",
  buttonTextColor: "#5a0016",
  mutedColor: "#7b7369",
  keywordColor: "#d4af37",
  fontFamily: "Cinzel",
  announcementText: "Vastra Sanvedan — one collection, online and in-store",
  contactPhone: "+91 99999 99999",
  contactEmail: "hello@vastrasanvedan.com",
  footerText: "Curated wardrobe from the atelier.",
  receiptHeaderText: "Retail Billing Receipt",
  receiptFooterText: "Thank you for shopping with us.\nVisit again soon.",
  productPageTitle: "The atelier edit",
  heroButtonText: "Explore the collection",
  heroButtonLink: "/shop",
};

function normalizeStoreSettings(raw = {}) {
  const source = raw || {};
  const next = {
    ...DEFAULT_STORE_CONFIG,
    ...source,
  };

  return {
    storeName: String(next.storeName || DEFAULT_STORE_CONFIG.storeName).trim() || DEFAULT_STORE_CONFIG.storeName,
    tagline: String(next.tagline || DEFAULT_STORE_CONFIG.tagline).trim() || DEFAULT_STORE_CONFIG.tagline,
    primaryColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.primaryColor || "")) ? next.primaryColor : DEFAULT_STORE_CONFIG.primaryColor,
    accentColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.accentColor || "")) ? next.accentColor : DEFAULT_STORE_CONFIG.accentColor,
    backgroundColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.backgroundColor || "")) ? next.backgroundColor : DEFAULT_STORE_CONFIG.backgroundColor,
    surfaceColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.surfaceColor || "")) ? next.surfaceColor : DEFAULT_STORE_CONFIG.surfaceColor,
    textColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.textColor || "")) ? next.textColor : DEFAULT_STORE_CONFIG.textColor,
    headingColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.headingColor || "")) ? next.headingColor : DEFAULT_STORE_CONFIG.headingColor,
    bodyColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.bodyColor || "")) ? next.bodyColor : DEFAULT_STORE_CONFIG.bodyColor,
    brandColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.brandColor || "")) ? next.brandColor : DEFAULT_STORE_CONFIG.brandColor,
    buttonColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.buttonColor || "")) ? next.buttonColor : DEFAULT_STORE_CONFIG.buttonColor,
    buttonTextColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.buttonTextColor || "")) ? next.buttonTextColor : DEFAULT_STORE_CONFIG.buttonTextColor,
    mutedColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.mutedColor || "")) ? next.mutedColor : DEFAULT_STORE_CONFIG.mutedColor,
    keywordColor: /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/.test(String(next.keywordColor || "")) ? next.keywordColor : DEFAULT_STORE_CONFIG.keywordColor,
    fontFamily: ["Outfit", "Cinzel", "Cormorant Garamond", "Playfair Display", "DM Sans", "Lora"].includes(String(next.fontFamily)) ? String(next.fontFamily) : DEFAULT_STORE_CONFIG.fontFamily,
    announcementText: String(next.announcementText || DEFAULT_STORE_CONFIG.announcementText).trim() || DEFAULT_STORE_CONFIG.announcementText,
    contactPhone: String(next.contactPhone || DEFAULT_STORE_CONFIG.contactPhone).trim() || DEFAULT_STORE_CONFIG.contactPhone,
    contactEmail: String(next.contactEmail || DEFAULT_STORE_CONFIG.contactEmail).trim() || DEFAULT_STORE_CONFIG.contactEmail,
    footerText: String(next.footerText || DEFAULT_STORE_CONFIG.footerText).trim() || DEFAULT_STORE_CONFIG.footerText,
    receiptHeaderText: String(next.receiptHeaderText || DEFAULT_STORE_CONFIG.receiptHeaderText).trim() || DEFAULT_STORE_CONFIG.receiptHeaderText,
    receiptFooterText: String(next.receiptFooterText || DEFAULT_STORE_CONFIG.receiptFooterText).trim() || DEFAULT_STORE_CONFIG.receiptFooterText,
    productPageTitle: String(next.productPageTitle || DEFAULT_STORE_CONFIG.productPageTitle).trim() || DEFAULT_STORE_CONFIG.productPageTitle,
    heroButtonText: String(next.heroButtonText || DEFAULT_STORE_CONFIG.heroButtonText).trim() || DEFAULT_STORE_CONFIG.heroButtonText,
    heroButtonLink: String(next.heroButtonLink || DEFAULT_STORE_CONFIG.heroButtonLink).trim() || DEFAULT_STORE_CONFIG.heroButtonLink,
  };
}

module.exports = {
  DEFAULT_STORE_CONFIG,
  normalizeStoreSettings,
};
