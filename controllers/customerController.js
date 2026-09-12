const crypto = require("crypto");
const Customer = require("../models/customerModel");
const AuditEvent = require("../models/auditModel");
const { hashPassword, verifyPassword, isStrongPassword } = require("../lib/passwords");
const { cookieHeader, clearCookie } = require("../middleware/auth");
const nodemailer = require("nodemailer");

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function emailOtpConfigured() {
  const user = String(process.env.SMTP_USER || "").trim().toLowerCase();
  const pass = String(process.env.SMTP_PASS || "").replace(/\s/g, "");
  return Boolean(
    process.env.SMTP_HOST &&
    user &&
    pass &&
    !user.includes("yourgmail") &&
    !pass.includes("your-") &&
    !pass.includes("naya-16-character") &&
    pass.length === 16
  );
}

function demoEmailOtpEnabled() {
  return String(process.env.DEMO_EMAIL_OTP || "false").toLowerCase() === "true" && process.env.NODE_ENV !== "production";
}

function mailTransport() {
  return nodemailer.createTransport({
    host: String(process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: String(process.env.SMTP_USER || "").trim(),
      pass: String(process.env.SMTP_PASS || "").replace(/\s/g, ""),
    },
  });
}

function otpHash(email, otp) {
  return crypto.createHash("sha256").update(`${email}:${otp}:${process.env.OTP_PEPPER || "vs-otp"}`).digest("hex");
}

async function requestEmailOtp(req, res) {
  if (!emailOtpConfigured() && !demoEmailOtpEnabled()) return res.status(503).json({ success: false, message: "Email OTP is not configured. Enable DEMO_EMAIL_OTP=true for free local testing." });
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email address." });
  const existing = req.app.locals.customerOtpChallenges.get(email);
  if (existing && Date.now() - existing.sentAt < OTP_RESEND_MS) return res.status(429).json({ success: false, message: "Please wait a minute before requesting another OTP." });
  const otp = String(crypto.randomInt(100000, 1000000));
  req.app.locals.customerOtpChallenges.set(email, { hash: otpHash(email, otp), sentAt: Date.now(), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  if (demoEmailOtpEnabled()) {
    return res.json({ success: true, demo: true, demoOtp: otp, message: "Demo OTP generated. Use the code shown below." });
  }
  try {
    await mailTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Your Vastra Sanvedan sign-in code",
      text: `Your Vastra Sanvedan OTP is ${otp}. It expires in 5 minutes. Do not share this code.`,
      html: `<p>Your Vastra Sanvedan sign-in code is:</p><h1 style="letter-spacing:8px">${otp}</h1><p>This code expires in 5 minutes. Do not share it.</p>`,
    });
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error("Customer OTP email failed:", error.message);
    req.app.locals.customerOtpChallenges.delete(email);
    const message = error.responseCode === 535
      ? "Gmail App Password invalid hai. Naya 16-character App Password .env ke SMTP_PASS mein daalo."
      : "OTP email send nahi hua. SMTP settings check karo.";
    res.status(502).json({ success: false, message });
  }
}

async function verifyEmailOtp(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();
  const challenge = req.app.locals.customerOtpChallenges.get(email);
  if (!challenge || Date.now() > challenge.expiresAt) return res.status(400).json({ success: false, message: "OTP expired. Request a new code." });
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter the 6-digit OTP." });
  challenge.attempts += 1;
  if (challenge.attempts > OTP_MAX_ATTEMPTS) {
    req.app.locals.customerOtpChallenges.delete(email);
    return res.status(429).json({ success: false, message: "Too many attempts. Request a new OTP." });
  }
  if (otpHash(email, otp) !== challenge.hash) return res.status(401).json({ success: false, message: "Incorrect OTP." });
  req.app.locals.customerOtpChallenges.delete(email);
  let customer = await Customer.findOne({ email });
  if (!customer) customer = await Customer.create({ name: email.split("@")[0], email });
  if (customer.blocked) return res.status(403).json({ success: false, message: "This account is blocked. Please contact the store." });
  startSession(req, res, customer._id);
  res.json({ success: true, customer: publicCustomer(customer) });
}

function publicCustomer(customer) {
  if (!customer) return null;
  return {
    id: String(customer._id),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
    addresses: customer.addresses || [],
    wishlist: (customer.wishlist || []).map(String),
    blocked: Boolean(customer.blocked),
  };
}

function startSession(req, res, customerId) {
  const token = crypto.randomBytes(32).toString("hex");
  req.app.locals.customerSessions.set(token, { customerId: String(customerId), createdAt: Date.now() });
  res.set("Set-Cookie", cookieHeader("vs_customer_session", token, 60 * 60 * 24 * 14));
}

function googleRedirectUri(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/customer/google/callback`;
}

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function googleLoginUrl(req, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function googleStart(req, res) {
  if (!googleConfigured()) return res.status(503).send("Google sign in is not configured yet.");
  const state = crypto.randomBytes(24).toString("hex");
  req.app.locals.googleOAuthStates.set(state, { createdAt: Date.now() });
  res.redirect(googleLoginUrl(req, state));
}

async function googleCallback(req, res) {
  const { code, state } = req.query;
  const savedState = state && req.app.locals.googleOAuthStates.get(state);
  req.app.locals.googleOAuthStates.delete(state);
  if (!savedState || Date.now() - savedState.createdAt > 10 * 60 * 1000 || !code) return res.redirect("/account?auth=google_failed");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: googleRedirectUri(req), grant_type: "authorization_code" }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw new Error("Google token exchange failed");
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified === false) throw new Error("Google profile unavailable");
    let customer = await Customer.findOne({ $or: [{ googleId: profile.sub }, { email: String(profile.email).toLowerCase() }] });
    if (customer) {
      customer.googleId = profile.sub;
      if (!customer.name && profile.name) customer.name = profile.name;
      await customer.save();
    } else {
      customer = await Customer.create({ name: profile.name || profile.email.split("@")[0], email: profile.email, googleId: profile.sub });
    }
    if (customer.blocked) return res.redirect("/account?auth=blocked");
    startSession(req, res, customer._id);
    res.redirect("/account?auth=success");
  } catch (_error) {
    res.redirect("/account?auth=google_failed");
  }
}

async function register(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: "Name, valid email and a password of at least 8 characters are required." });
    }
    if (await Customer.exists({ email })) return res.status(409).json({ success: false, message: "An account with this email already exists." });
    const customer = await Customer.create({ name, email, phone, passwordHash: hashPassword(password) });
    startSession(req, res, customer._id);
    res.status(201).json({ success: true, customer: publicCustomer(customer) });
  } catch (error) {
    res.status(400).json({ success: false, message: "Account could not be created." });
  }
}

async function login(req, res) {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    }
    const customer = await Customer.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
    if (!customer || !customer.passwordHash || !verifyPassword(password, customer.passwordHash)) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    if (customer.blocked) return res.status(403).json({ success: false, message: "This account is blocked. Please contact the store." });
    startSession(req, res, customer._id);
    res.json({ success: true, customer: publicCustomer(customer) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Sign in failed." });
  }
}

async function logout(req, res) {
  if (req.customerSession) req.app.locals.customerSessions.delete(req.customerSession);
  res.set("Set-Cookie", clearCookie("vs_customer_session")).json({ success: true });
}

async function me(req, res) {
  const customer = await Customer.findById(req.customerId).lean();
  if (!customer) return res.status(401).json({ success: false, message: "Please sign in to continue." });
  res.json({ success: true, customer: publicCustomer(customer) });
}

async function updateProfile(req, res) {
  try {
    const customer = await Customer.findById(req.customerId);
    if (!customer) return res.status(401).json({ success: false, message: "Please sign in to continue." });
    if (customer.blocked) return res.status(403).json({ success: false, message: "This account is restricted." });
    const name = String(req.body?.name || customer.name).trim();
    const phone = String(req.body?.phone || "").trim();
    customer.name = name || customer.name;
    customer.phone = phone;
    if (Array.isArray(req.body?.addresses)) {
      customer.addresses = req.body.addresses.map((address) => ({
        name: String(address.name || customer.name).trim(),
        phone: String(address.phone || phone).trim(),
        address: String(address.address || "").trim(),
        city: String(address.city || "").trim(),
        district: String(address.district || "").trim(),
        state: String(address.state || "").trim(),
        pincode: String(address.pincode || "").trim(),
        isDefault: Boolean(address.isDefault),
      }));
    }
    if (Array.isArray(req.body?.wishlist)) customer.wishlist = req.body.wishlist.filter((id) => require("mongoose").isValidObjectId(id));
    await customer.save();
    res.json({ success: true, customer: publicCustomer(customer) });
  } catch (error) {
    res.status(400).json({ success: false, message: "Profile could not be updated." });
  }
}

async function listCustomers(_req, res) {
  const customers = await Customer.find().sort({ createdAt: -1 }).select("-passwordHash").lean();
  res.json({ success: true, customers });
}

async function getCustomer(req, res) {
  const Order = require("../models/orderModel");
  const customer = await Customer.findById(req.params.id).select("-passwordHash").lean();
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
  const orders = await Order.find({ $or: [{ customerId: customer._id }, { "customer.email": customer.email }] }).sort({ createdAt: -1 }).lean();
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  res.json({
    success: true,
    customer,
    ledger: {
      totalOrders: orders.length,
      totalSpent,
      online: orders.filter((order) => order.orderType === "WEB_ONLINE").length,
      offline: orders.filter((order) => order.orderType === "POS_OFFLINE").length,
    },
    orders,
  });
}

async function setBlocked(req, res) {
  const blocked = Boolean(req.body?.blocked);
  const reason = String(req.body?.reason || "").trim();
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { $set: { blocked, blockedAt: blocked ? new Date() : null, blockedReason: blocked ? reason : "" } },
    { new: true }
  ).select("-passwordHash");
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
  if (blocked) {
    for (const [token, session] of req.app.locals.customerSessions.entries()) {
      if (session.customerId === String(customer._id)) req.app.locals.customerSessions.delete(token);
    }
  }
  await AuditEvent.create({
    actor: "admin",
    action: blocked ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED",
    targetType: "Customer",
    targetId: String(customer._id),
    details: reason || (blocked ? "Account blocked" : "Account restored"),
  });
  res.json({ success: true, customer });
}

module.exports = { register, login, logout, me, updateProfile, listCustomers, getCustomer, setBlocked, publicCustomer, googleStart, googleCallback, googleConfigured, requestEmailOtp, verifyEmailOtp, emailOtpConfigured };
