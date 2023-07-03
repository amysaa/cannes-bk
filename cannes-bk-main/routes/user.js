const router = require("express").Router();

const userController = require("../controllers/user");
const isAuth = require("../middlewares/isAuth");

router.get("/", isAuth, userController.fetchUserProfile);

router.post("/address", isAuth, userController.addAddress);

router.put("/address", isAuth, userController.updateAddress);

router.get("/orders", isAuth, userController.getOrders);

router.get(
  "/order/:orderId/invoice",
  isAuth,
  userController.generateOrderInvoice
);

module.exports = router;
