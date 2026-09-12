const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function isStrongPassword(password) {
  return String(password || "").length >= 8;
}

module.exports = { hashPassword, verifyPassword, isStrongPassword };
