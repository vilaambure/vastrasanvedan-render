const express = require("express");
const { getHomepage } = require("../controllers/contentController");

const router = express.Router();
router.get("/homepage", getHomepage);

module.exports = router;
