const path = require("path");

const express = require("express");

const router = express.Router();

router.get("/", (req, res, next) => {
  console.log("SUB DOMAIN ROUTE FOR IMAGES");
  res.status(200).json({ message: "HOME MEDIA" });
});

router.get("/images/:name", (req, res, next) => {
  const name = req.params.name;
  res.sendFile(path.join(__dirname, "public", "brand_images", name));
});

module.exports = router;
