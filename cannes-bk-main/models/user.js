const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "USER",
    },
    provider: {
      type: String,
      default: "email",
    },
    verificationToken: String,
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
    },
    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
  },
  { timestamps: true }
);

userSchema.methods.getForgotPasswordToken = function () {
  const forgotToken = crypto.randomBytes(30).toString("hex");
  this.resetToken = crypto
    .createHash("sha256")
    .update(forgotToken)
    .digest("hex");

  this.resetTokenExpiration = Date.now() + 20 * 60 * 1000;

  return forgotToken;
};

userSchema.methods.getJwtToken = function () {
  return jwt.sign(
    { email: this.email, userId: this._id },
    process.env.JWT_KEY,
    {
      expiresIn: "1h",
    }
  );
};

module.exports = mongoose.model("User", userSchema);
