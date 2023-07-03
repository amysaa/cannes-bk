const cloudinary = require("cloudinary");
const Product = require("../models/product");

const { validationResult } = require("express-validator");

const categories = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Clothing" },
  { id: 3, name: "Sports" },
  { id: 4, name: "Health" },
  { id: 5, name: "Appliances" },
  { id: 6, name: "Furniture" },
  { id: 7, name: "Watches" },
  { id: 8, name: "Games" },
];

exports.getSingleProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate("reviews.userId", "name")
      .exec();

    if (!product) {
      const err = new Error("Product not found");
      err.httpStatusCode = 404;
      return next(err);
    }

    return res.status(200).json({ status: "SUCCESS", product });
  } catch (error) {
    const err = new Error("Could not fetch Product Details");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.addProduct = async (req, res, next) => {
  const { name, price, description, category, brand } = req.body;

  let imageArray = [];

  console.log(req.files);

  if (req.files) {
    for (let index = 0; index < req.files.photos.length; index++) {
      let result = await cloudinary.v2.uploader.upload(
        req.files.photos[index].tempFilePath,
        {
          folder: "products",
        }
      );

      imageArray.push({
        id: result.public_id,
        secure_url: result.secure_url,
      });
    }
  }

  await Product.create({
    name,
    price,
    description,
    category,
    brand,
    imageUrls: imageArray,
  });
  res.status(200).json({ status: "SUCCESS" });
};

exports.getProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const regex = new RegExp(q, "i");
    const products = await Product.find({
      $or: [{ name: regex }, { description: regex }],
    }).select("-createdAt -updatedAt -ratings -reviews");

    res.status(200).json({ status: "SUCCESS", products, categories });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not fetch Products");
    err.httpStatusCode = 400;
    return next(err);
  }
};

exports.postAddReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array()[0]);
      const err = new Error(errors.array()[0].msg);
      err.httpStatusCode = 422;
      return next(err);
    }

    const { text, rating } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "No Product found" });
    }
    console.log(productId, text, rating, product.name);

    if (!product.reviews) {
      product.reviews = [];
    }

    if (!product.ratings) {
      product.ratings = [];
    }

    const isAlreadyReviewdByUser = product.reviews.find(
      (item) => item.userId.toString() === req.userId
    );
    const isAlreadyRated = product.ratings.find(
      (item) => item.userId.toString() === req.userId
    );

    if (isAlreadyReviewdByUser) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "User already added a review" });
    }
    if (isAlreadyRated) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "User already added a rating" });
    }

    let newReview = {
      userId: req.userId,
      text,
    };

    let newRating = {
      userId: req.userId,
      rating,
    };

    product.ratings.push(newRating);

    product.reviews.push(newReview);

    await product.save();

    res
      .status(200)
      .json({ status: "SUCCESS", message: "Product Reviews Successfully!" });
  } catch (error) {
    console.log(error);

    const err = new Error("Could not post Review.");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "No Product found" });
    }
    if (!product.reviews) {
      product.reviews = [];
    }

    const isAlreadyReviewdByUser = product.reviews.find(
      (item) => item.userId.toString() === req.userId
    );

    if (!isAlreadyReviewdByUser) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Product was not reviewed by user" });
    }

    product.reviews.splice(isAlreadyReviewdByUser, 1);
    await product.save();
    res.status(200).json({
      status: "SUCCESS",
      message: "Deleted Product Review Successfully!",
    });
  } catch (error) {
    console.log(error);

    const err = new Error("Could not delete Review.");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { text } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "No Product found" });
    }
    if (!product.reviews) {
      product.reviews = [];
    }

    const review = product.reviews.find(
      (review) => review.userId.toString() === req.userId
    );

    if (!review) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "No review found!" });
    }

    review.text = text;

    await product.save();

    res
      .status(200)
      .json({ status: "SUCCESS", message: "Updated Review Successfully!" });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not update Review.");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.addProductRating = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array()[0]);
      const err = new Error(errors.array()[0].msg);
      err.httpStatusCode = 422;
      return next(err);
    }

    const { rating } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "No Product found" });
    }
    if (!product.ratings) {
      product.ratings = [];
    }

    const isAlreadyRated = product.ratings.find(
      (item) => item.userId.toString() === req.userId
    );

    if (isAlreadyRated) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "User already added a rating" });
    }

    let newRating = {
      userId: req.userId,
      rating,
    };

    product.ratings.push(newRating);

    await product.save();

    res
      .status(200)
      .json({ status: "SUCCESS", message: "Product Rated Successfully!" });
  } catch (error) {
    console.log(error);

    const err = new Error("Could not post rating.");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.deleteProductRating = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "No Product found" });
    }
    if (!product.reviews) {
      product.reviews = [];
    }

    const isAlreadyReviewdByUser = product.ratings.find(
      (item) => item.userId.toString() === req.userId
    );

    if (!isAlreadyReviewdByUser) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Product was not rated by user" });
    }

    product.ratings.splice(isAlreadyReviewdByUser, 1);
    await product.save();
    res.status(200).json({
      status: "SUCCESS",
      message: "Deleted Product Rating Successfully!",
    });
  } catch (error) {
    console.log(error);

    const err = new Error("Could not delete Review.");
    err.httpStatusCode = 500;
    return next(err);
  }
};
