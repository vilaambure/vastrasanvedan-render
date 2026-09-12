const express = require("express");
const { register, login, logout, me, updateProfile, googleStart, googleCallback, googleConfigured, requestEmailOtp, verifyEmailOtp, emailOtpConfigured } = require("../controllers/customerController");
const { requireCustomer, optionalCustomer } = require("../middleware/auth");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/email-otp/request", requestEmailOtp);
router.post("/email-otp/verify", verifyEmailOtp);
router.get("/email-otp/status", (_req, res) => res.json({ configured: emailOtpConfigured() || String(process.env.DEMO_EMAIL_OTP || "false").toLowerCase() === "true", demo: String(process.env.DEMO_EMAIL_OTP || "false").toLowerCase() === "true" }));
router.post("/logout", optionalCustomer, logout);
router.get("/me", requireCustomer, me);
router.put("/me", requireCustomer, updateProfile);
router.get("/google/status", (_req, res) => res.json({ configured: googleConfigured() }));
router.get("/google", googleStart);
router.get("/google/callback", googleCallback);

module.exports = router;
