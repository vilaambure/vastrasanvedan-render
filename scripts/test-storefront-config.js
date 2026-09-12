const assert = require("node:assert/strict");
const { normalizeStoreSettings } = require("../lib/storefrontConfig");

const settings = normalizeStoreSettings({
  storeName: "Vastra Sanvedan",
  tagline: "Crafted for everyday rituals.",
  primaryColor: "#1c1814",
  accentColor: "#d9c3a0",
  announcementText: "New edit live",
  contactPhone: "+91 98765 43210",
  footerText: "Curated wardrobe from the atelier.",
});

assert.equal(settings.storeName, "Vastra Sanvedan");
assert.equal(settings.tagline, "Crafted for everyday rituals.");
assert.equal(settings.primaryColor, "#1c1814");
assert.equal(settings.accentColor, "#d9c3a0");
assert.equal(settings.announcementText, "New edit live");
assert.equal(settings.contactPhone, "+91 98765 43210");
assert.equal(settings.footerText, "Curated wardrobe from the atelier.");

const fallback = normalizeStoreSettings({});
assert.equal(fallback.storeName, "Vastra Sanvedan");
assert.equal(fallback.tagline, "Clothes with a point of view.");
assert.match(fallback.primaryColor, /^#/);
assert.match(fallback.accentColor, /^#/);

console.log("storefront config test passed");
