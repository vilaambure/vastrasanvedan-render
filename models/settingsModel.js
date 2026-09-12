const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "store" },
    storeName: { type: String, default: "Vastra Sanvedan", trim: true },
    tagline: { type: String, default: "Clothes with a point of view.", trim: true },
    primaryColor: { type: String, default: "#1c1814", trim: true },
    accentColor: { type: String, default: "#d9c3a0", trim: true },
    backgroundColor: { type: String, default: "#f4efe8", trim: true },
    surfaceColor: { type: String, default: "#fbf8f3", trim: true },
    textColor: { type: String, default: "#1c1814", trim: true },
    headingColor: { type: String, default: "#faf8f5", trim: true },
    bodyColor: { type: String, default: "#fffdf9", trim: true },
    brandColor: { type: String, default: "#d4af37", trim: true },
    buttonColor: { type: String, default: "#d4af37", trim: true },
    buttonTextColor: { type: String, default: "#5a0016", trim: true },
    mutedColor: { type: String, default: "#7b7369", trim: true },
    keywordColor: { type: String, default: "#d4af37", trim: true },
    fontFamily: { type: String, default: "Cinzel", trim: true },
    announcementText: { type: String, default: "Vastra Sanvedan — one collection, online and in-store", trim: true },
    contactPhone: { type: String, default: "+91 99999 99999", trim: true },
    whatsappMessage: { type: String, default: "Hello Vastra Sanvedan,\nI want to order:\n{productLines}\n\nTotal: {total}{customerInfo}\n\nPlease confirm availability and delivery details.", trim: true },
    contactEmail: { type: String, default: "hello@vastrasanvedan.com", trim: true },
    footerText: { type: String, default: "Curated wardrobe from the atelier.", trim: true },
    receiptHeaderText: { type: String, default: "Retail Billing Receipt", trim: true },
    receiptFooterText: { type: String, default: "Thank you for shopping with us.\nVisit again soon.", trim: true },
    productPageTitle: { type: String, default: "The atelier edit", trim: true },
    heroButtonText: { type: String, default: "Explore the collection", trim: true },
    heroButtonLink: { type: String, default: "/shop", trim: true },
    upiId: { type: String, default: "", trim: true },
    upiQrImage: { type: String, default: "" },
    autoConfirmVerifiedPayments: { type: Boolean, default: true },
    paymentProvider: { type: String, default: "manual", trim: true },
    paymentGatewayMerchantId: { type: String, default: "", trim: true },
    paymentGatewaySecret: { type: String, default: "", trim: true },
    paymentWebhookSecret: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreSettings", settingsSchema);
