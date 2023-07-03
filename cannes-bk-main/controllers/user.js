const User = require("../models/user");
const Order = require("../models/order");
const Address = require("../models/address");

const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");

exports.fetchUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate("address").exec();

    if (!user) {
      const err = new Error("User not found");
      err.httpStatusCode = 404;
      return next(err);
    }

    user.password = undefined;
    user.role = undefined;

    res.status(200).json({ status: "SUCCESS", user });
  } catch (error) {
    const err = new Error("Could not fetch user profile");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const { street, city, state, country, postalCode } = req.body;

    if (!street || !city || !state || !country || !postalCode) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid Address" });
    }

    const user = await User.findById(req.userId).populate("address").exec();

    console.log(user.address);

    if (user.address) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "User Already added Address" });
    }

    const address = await Address.create({
      street,
      city,
      state,
      country,
      postalCode,
    });

    user.address = address._id;

    await user.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Added Address Successfully!",
    });
  } catch (error) {
    const err = new Error("Could not fetch user profile");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { street, city, state, country, postalCode } = req.body;

    console.log(req.body);

    if (!street || !city || !state || !country || !postalCode) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid Address" });
    }

    const user = await User.findById(req.userId);

    if (!user.address) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "No Address to update!" });
    }

    const address = await Address.findById(user.address);

    if (!address) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "No Address to update!" });
    }

    address.street = street;
    address.city = city;
    address.state = state;
    address.country = country;
    address.postalCode = postalCode;

    await address.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Updated Address Successfully!",
    });
  } catch (error) {
    const err = new Error("Could not update Address");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("products.product", "name price")
      .populate("shippingAddress", "street city")
      .exec();

    res
      .status(200)
      .json({ status: "SUCCESS", message: "Orders are sent", orders });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not get Orders!");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.generateOrderInvoice = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.orderId)
      .populate("user", "name email")
      .populate("products.product", "name price")
      .populate("shippingAddress")
      .exec();

    if (!order) {
      const err = new Error("Invalid Order ID");
      err.httpStatusCode = 404;
      return next(err);
    }

    const filePath = path.join(
      __dirname,
      "../",
      "ordersPDFs",
      `${order._id}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${`${order._id}.pdf`}`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    return;
  } catch (error) {
    console.log(error);
    const err = new Error("Could not generate invoice");
    err.httpStatusCode = 500;
    next(err);
  }
};
