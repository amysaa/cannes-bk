const Cart = require("../models/cart");
const User = require("../models/user");
const Order = require("../models/order");
const Product = require("../models/product");

const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const { validationResult } = require("express-validator");
const { sendMail } = require("../utils/email-util");

const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");

exports.getUserCart = async (req, res, next) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.product",
        select: "imageUrls name _id price",
      })
      .exec();

    if (!cart) {
      return res
        .status(200)
        .json({ status: "SUCCESS", message: "Cart is Empty" });
    }

    const totalPrice = cart.calculateTotalPrice(cart.couponCode);
    await cart.save();

    return res.status(200).json({ status: "SUCCESS", cart });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not fetch Cart");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.addtoCart = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = new Error(errors.array()[0].msg);
      err.httpStatusCode = 422;
      return next(err);
    }

    const userId = req.userId;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(200)
        .json({ status: "ERROR", message: "Invalid Product Id" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(400).json({ status: "ERRROR", message: "Product not found" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      const cart = await Cart.create({
        userId,
        items: [
          {
            product: productId,
            quantity: 1,
          },
        ],
      });
      await cart.save();
      res.status(200).json({
        status: "SUCCESS",
        message: "Cart Created, Product is Added",
        cart,
      });
    }

    let itemIndex = cart.items.findIndex(
      (p) => p.product.toString() === productId
    );

    if (itemIndex > -1) {
      console.log("ITEM IS ALREADY IN CART");
      let productItem = cart.items[itemIndex];
      productItem.quantity = productItem.quantity + 1;
      cart.items[itemIndex] = productItem;
    } else {
      cart.items.push({ product: productId, quantity: 1 });
    }
    await cart.save();

    logger.info(`PRODUCT ADDED TO CARD`, { userId });

    return res.status(200).json({ status: "SUCCESS", cart });
  } catch (error) {
    console.log(error);
    const err = new Error("Unable to add to Cart");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Cart doesn't exists!" });
    }

    let itemIndex = cart.items.findIndex(
      (p) => p.product.toString() === productId
    );

    if (itemIndex < 0) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Item doesn't exists in Cart" });
    }

    let productItem = cart.items[itemIndex];

    if (productItem.quantity > 1) {
      productItem.quantity = productItem.quantity - 1;
      cart.items[itemIndex] = productItem;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();

    res.status(200).json({ status: "SUCCESS", cart });
  } catch (error) {
    console.log(error);
    const err = new Error("Unable to remove from Cart");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {};

exports.clearCart = async (req, res, next) => {
  const userId = req.userId;

  try {
    await Cart.findOneAndDelete({ userId });
    res.status(200).json({ status: "SUCCESS", message: "Cleared Cart" });
  } catch (error) {
    const err = new Error("Could not clear Cart");
    err.httpStatusCode = 401;
    return next(err);
  }
};

exports.applyDiscountOnCart = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    console.log(couponCode, " COUPON CODE IN BODY");

    const cart = await Cart.findOne({ userId: req.userId })
      .populate({
        path: "items.product",
        select: "imageUrls name _id price",
      })
      .exec();

    if (!cart) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Cart not found" });
    }
    cart.calculateTotalPrice(couponCode);
    await cart.save();
    res.status(200).json({
      status: "SUCCESS",
      message: "Applied Discount",
      cart,
    });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not apply discount");
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ userId })
      .populate("items.product", "price name")
      .exec();

    if (!cart) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "No cart found" });
    }

    const user = await User.findById(userId);

    if (!user.isVerified) {
      res.status(401).json({ status: "ERROR", message: "User not verified" });
    }

    if (!user.address) {
      res
        .status(400)
        .json({ status: "ERROR", message: "Please add a address" });
    }

    const token = user.getJwtToken();

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      mode: "payment",
      success_url: process.env.FRONTEND_SERVER_URL + "/orders",
      cancel_url: process.env.FRONTEND_SERVER_URL + "/cart",
      line_items: cart.items.map((p) => {
        return {
          price_data: {
            currency: "INR",
            product_data: {
              name: p.product.name,
            },
            unit_amount: p.product.price * 100,
          },
          quantity: p.quantity,
        };
      }),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 150 * 100,
              currency: "INR",
            },
            display_name: "Next day air",
          },
        },
      ],
      discounts: [
        {
          coupon: "gOj47W1N",
        },
      ],
      metadata: {
        token: token,
      },
    });
    return res.status(200).json({ status: "REDIRECT", url: session.url });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not place order!");
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.checkoutSuccess = async (req, res, next) => {
  try {
    console.log("STRIPE GATEWAY SENDED A RESPONSE");
    const event = req.body;

    console.log(event, "       This is the event");

    let token;
    if (!event || event.type !== "checkout.session.completed") {
      console.log("EVENT NOT MATCHED");
      return res.sendStatus(400);
    }
    token = event.data.object.metadata.token;
    let decodedData = await jwt.decode(token, process.env.JWT_KEY);
    console.log(decodedData);

    const userId = decodedData.userId;

    const cart = await Cart.findOne({ userId })
      .populate("items.product", "price name")
      .exec();

    console.log(cart);

    if (!cart) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "No cart found" });
    }

    const user = await User.findById(userId).populate("address").exec();

    console.log(user);

    const order = await Order.create({
      user: userId,
      products: cart.items,
      shippingAddress: user.address,
      totalAmount: cart.totalPrice,
    });

    console.log(order);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(
      path.join(__dirname, "../", "ordersPDFs", `${order._id}.pdf`)
    );

    doc.pipe(stream);
    doc.fontSize(24).text("Cannes", { align: "center" });
    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Bill To:", { underline: true });
    doc.text(`Customer Name: ${user.name}`);
    doc.text(`Customer Email: ${user.email}`);
    doc.moveDown();

    doc.fontSize(14).text("ShippingAddress:", { underline: true });
    doc.text(
      `${user.address.street}, ${user.address.city}, ${user.address.state}, ${user.address.country}`
    );
    doc.text("Pincode : " + user.address.postalCode);
    doc.moveDown();
    doc.moveDown();

    // Order details
    doc.fontSize(14).text("Order Details:", { underline: true });

    cart.items.forEach((item, index) => {
      doc.text(`${index + 1}. Product: ${item.product.name}`);
      doc.text(`   Quantity: ${item.quantity}`);
      doc.text(`   Price: Rs. ${item.product.price}`);
      doc.moveDown();
    });

    doc.fontSize(16).text(`Total Amount: Rs. ${order.totalAmount}`, {
      align: "right",
    });
    doc.moveDown();
    doc.end();

    const options = {
      email: user.email,
      subject: `Invoice of Order`,
      html: "Please find attached invoice of your order",
      path: order._id,
    };

    await Cart.findOneAndDelete({ userId });
    await user.save();
    await order.save();
    await sendMail(options);
    logger.info({ userId, message: "WROTE TO EMAIL" });

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    const err = new Error("Could not checkout success");
    err.httpStatusCode = 500;
    next(err);
  }
};
