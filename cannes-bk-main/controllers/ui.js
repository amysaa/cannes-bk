const Product = require("../models/product");

const carouselElements = [
  {
    id: "1",
    title: "Level up your style with our summer collections",
    linkto: "",
    image:
      "https://images.pexels.com/photos/8386645/pexels-photo-8386645.jpeg?auto=compress",
  },
  {
    id: "1",
    title: "Enjoying this platoform with max enthusiasm",
    linkto: "",
    image:
      "https://images.pexels.com/photos/7679453/pexels-photo-7679453.jpeg?auto=compress",
  },
  {
    id: "1",
    title: "Level up your style with our summer collections",
    linkto: "",
    image:
      "https://images.pexels.com/photos/5531746/pexels-photo-5531746.jpeg?auto=compress",
  },
];

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find().limit(6);

    res.status(200).json({ status: "SUCCESS", products, carouselElements });
  } catch (error) {
    const err = new Error("Could not fetch Products");
    err.httpStatusCode = 500;
    next(err);
    next(err);
  }
};
