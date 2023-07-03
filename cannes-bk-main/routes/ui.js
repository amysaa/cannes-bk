const router = require("express").Router();

const uiController = require("../controllers/ui");

router.get("/trending", uiController.getFeaturedProducts);

module.exports = router;
