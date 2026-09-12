const StoreSettings = require("../models/settingsModel");
const { normalizeStoreSettings } = require("../lib/storefrontConfig");

function publicSettings(settings) {
  const storefront = normalizeStoreSettings(settings || {});
  return {
    ...storefront,
    upiId: settings?.upiId || "",
    upiQrImage: settings?.upiQrImage || "",
    paymentProviderConfigured: Boolean(settings?.paymentGatewayMerchantId || settings?.paymentGatewaySecret || settings?.paymentWebhookSecret || process.env.PAYMENT_PROVIDER || process.env.PAYMENT_GATEWAY_MERCHANT_ID || process.env.PAYMENT_GATEWAY_SECRET || process.env.PAYMENT_WEBHOOK_SECRET),
    paymentProvider: settings?.paymentProvider || process.env.PAYMENT_PROVIDER || "manual",
  };
}

function adminSettings(settings) {
  return {
    ...publicSettings(settings),
    autoConfirmVerifiedPayments: settings?.autoConfirmVerifiedPayments !== false,
    paymentProvider: settings?.paymentProvider || process.env.PAYMENT_PROVIDER || "manual",
    paymentGatewayMerchantId: Boolean(settings?.paymentGatewayMerchantId || process.env.PAYMENT_GATEWAY_MERCHANT_ID),
    paymentWebhookSecretConfigured: Boolean(settings?.paymentWebhookSecret || process.env.PAYMENT_WEBHOOK_SECRET),
  };
}

async function getSettings(req, res) {
  try {
    const settings = await StoreSettings.findOne({ key: "store" }).lean();
    const payload = req.adminSession ? adminSettings(settings) : publicSettings(settings);
    res.json({ success: true, settings: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: "Payment settings could not be loaded." });
  }
}

async function saveSettings(req, res) {
  try {
    const storefront = normalizeStoreSettings(req.body || {});
    const upiId = String(req.body?.upiId || "").trim();
    const upiQrImage = String(req.body?.upiQrImage || "");
    if (upiQrImage.length > 8 * 1024 * 1024) return res.status(400).json({ success: false, message: "QR image must be 6 MB or smaller." });
    const update = {
      key: "store",
      ...storefront,
      upiId,
    };
    if (upiQrImage) update.upiQrImage = upiQrImage;
    if (typeof req.body?.autoConfirmVerifiedPayments === "boolean") update.autoConfirmVerifiedPayments = req.body.autoConfirmVerifiedPayments;
    if (typeof req.body?.paymentProvider === "string") update.paymentProvider = req.body.paymentProvider.trim() || "manual";
    if (typeof req.body?.paymentGatewayMerchantId === "string") update.paymentGatewayMerchantId = req.body.paymentGatewayMerchantId.trim();
    if (typeof req.body?.paymentGatewaySecret === "string") update.paymentGatewaySecret = req.body.paymentGatewaySecret.trim();
    if (typeof req.body?.paymentWebhookSecret === "string") update.paymentWebhookSecret = req.body.paymentWebhookSecret.trim();
    const settings = await StoreSettings.findOneAndUpdate({ key: "store" }, { $set: update }, { upsert: true, new: true, runValidators: true }).lean();
    res.json({ success: true, settings: adminSettings(settings) });
  } catch (error) {
    res.status(400).json({ success: false, message: "Payment settings could not be saved." });
  }
}

module.exports = { getSettings, saveSettings, adminSettings };
