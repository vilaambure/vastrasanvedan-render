const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const MAX_VIDEO = 40 * 1024 * 1024;
const MAX_IMAGE = 6 * 1024 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function extensionFor(type) {
  if (type === "video/mp4") return ".mp4";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return "";
}

async function uploadMedia(req, res) {
  try {
    ensureUploadDir();
    const type = String(req.headers["content-type"] || "").split(";")[0].trim();
    const ext = extensionFor(type);
    if (!ext) return res.status(400).json({ success: false, message: "Only JPEG, PNG, WebP and MP4 uploads are allowed." });
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
    const limit = ext === ".mp4" ? MAX_VIDEO : MAX_IMAGE;
    if (!buffer.length) return res.status(400).json({ success: false, message: "Empty file." });
    if (buffer.length > limit) return res.status(400).json({ success: false, message: ext === ".mp4" ? "Video must be 40 MB or smaller." : "Image must be 6 MB or smaller." });
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
    res.status(201).json({ success: true, url: `/uploads/${name}` });
  } catch (error) {
    res.status(400).json({ success: false, message: "File could not be uploaded." });
  }
}

module.exports = { uploadMedia, ensureUploadDir, UPLOAD_DIR };
