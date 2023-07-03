require("dotenv").config();

const path = require("path");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary");
const mongoose = require("mongoose");
const morgan = require("morgan");
const express = require("express");
const subdomain = require("express-subdomain");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const uiRoutes = require("./routes/ui");

const mediaRouter = require("./routes/media");

const app = express();

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

// app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(subdomain("api", mediaRouter));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "DELETE", "OPTIONS", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/temp/",
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    abortOnLimit: true,
    safeFileNames: true,
    limitHandler: (req, res, next) => {
      const err = new Error("File too large, max 10MB is expected");
      err.httpStatusCode = 413;
      return next(err);
    },
  })
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes);
app.use("/cdn", mediaRouter);
app.use("/ui", uiRoutes);

app.use((error, req, res, next) => {
  return res.status(error.httpStatusCode || 500).json({
    status: "ERROR",
    errorMessage: error.message,
    errorStatusCode: error.httpStatusCode,
  });
});

mongoose
  .connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then((res) => {
    app.listen(PORT, () => {
      console.log("DATABASE CONNECTED");
      console.log(`Server is running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
