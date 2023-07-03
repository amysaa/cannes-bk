const express = require("express");
const isAuth = require("../middlewares/isAuth");
const cartController = require("../controllers/cart");
const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, cartController.getUserCart);

// POST Add to Cart
router.post(
  "/add",
  isAuth,
  body("productId").trim().isLength({ min: 5 }),
  cartController.addtoCart
);

// DELETE Remove from Cart
router.delete("/remove", isAuth, cartController.removeFromCart);

// DELETE Clear the Cart
router.delete("/all", isAuth, cartController.clearCart);

// POST applyDiscount
router.post("/applyDiscount", isAuth, cartController.applyDiscountOnCart);

// POST Checkout Cart
router.get("/checkout", isAuth, cartController.checkout);

router.post("/checkout/success", cartController.checkoutSuccess);

module.exports = router;
