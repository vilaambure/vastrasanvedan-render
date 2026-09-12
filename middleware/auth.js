const crypto = require("crypto");

function readCookie(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") || "";
}

function timingEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (!left.length || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(left, right);
  } catch (_error) {
    return false;
  }
}

function normalizeSecret(value) {
  return String(value ?? "").trim();
}

function adminPasswordMatches(password) {
  const actual = normalizeSecret(password);
  if (!actual) return false;
  const candidates = new Set([
    normalizeSecret(process.env.ADMIN_PASSWORD),
    normalizeSecret(process.env.ADMIN_PASS),
    normalizeSecret(process.env.VASTRA_ADMIN_PASSWORD),
    normalizeSecret(process.env.PASSWORD),
  ]);
  for (const candidate of candidates) {
    if (candidate && timingEqual(actual, candidate)) return true;
  }
  return false;
}

function cookieHeader(name, token, maxAge) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${name}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name) {
  return cookieHeader(name, "", 0);
}

function requireAdmin(req, res, next) {
  const token = readCookie(req, "vs_admin_session");
  const session = token && req.app.locals.adminSessions?.get(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Admin access required." });
  }
  req.adminSession = token;
  next();
}

function hasValidAdminSession(req) {
  const token = readCookie(req, "vs_admin_session");
  return Boolean(token && req.app.locals.adminSessions?.get(token));
}

async function requireCustomer(req, res, next) {
  const token = readCookie(req, "vs_customer_session");
  const session = token && req.app.locals.customerSessions?.get(token);
  if (!session) return res.status(401).json({ success: false, message: "Please sign in to continue." });
  const Customer = require("../models/customerModel");
  const customer = await Customer.findById(session.customerId).select("blocked").lean();
  if (!customer || customer.blocked) {
    req.app.locals.customerSessions.delete(token);
    res.set("Set-Cookie", clearCookie("vs_customer_session"));
    return res.status(403).json({ success: false, message: "This account is blocked. Please contact the store." });
  }
  req.customerId = session.customerId;
  req.customerSession = token;
  next();
}

function optionalCustomer(req, _res, next) {
  const token = readCookie(req, "vs_customer_session");
  const session = token && req.app.locals.customerSessions?.get(token);
  if (session) {
    req.customerId = session.customerId;
    req.customerSession = token;
  }
  next();
}

module.exports = {
  readCookie,
  timingEqual,
  adminPasswordMatches,
  cookieHeader,
  clearCookie,
  requireAdmin,
  hasValidAdminSession,
  requireCustomer,
  optionalCustomer,
};
