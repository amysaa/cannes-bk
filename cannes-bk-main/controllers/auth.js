const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { validationResult } = require("express-validator");

const User = require("../models/user");
const { sendMail } = require("../utils/email-util");
const { cookieToken } = require("../utils/cookit-Token");
const cookie = require("cookie");

exports.fetchProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId, "name email");
    return res.status(200).json({ status: "SUCCESS", user });
  } catch (error) {
    console.log(error);
    const err = new Error("Could not fetch Profile");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array()[0]);
      const err = new Error(errors.array()[0].msg);
      err.httpStatusCode = 422;
      return next(err);
    }

    const { name, email, password } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      const error = new Error("User Already Exists");
      error.httpStatusCode = 422;
      return next(error);
    }

    const verificationToken = generateVerificationToken();

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      image: {
        id: "image id",
        secure_url: "secure url def",
      },
    });

    await newUser.save();

    const options = {
      email: email,
      subject: "Welcome to Cannes",
      html: `
      Dear ${name}, We are pleased that you joined us!,
      Please verify your email, by clicking on the link below.

      <p>Click <a href="http://localhost:4000/auth/verify/${verificationToken}">here</a> to verify your email.</p>

      `,
    };

    await sendMail(options);

    return res.status(200).json({
      status: "SUCCESS",
      message: "Account Created! Please check email",
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Please try again later!");
    error.httpStatusCode = 500;
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid token" });
    }
    user.isVerified = true;
    user.verificationToken = undefined;

    await user.save();
    res.status(200).send("<h1>You are verified, You may now login!</h2>");
  } catch (error) {
    console.log(error);
    const err = new Error("Could not Verify User");
    err.httpStatusCode = 400;
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Login Logic
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = new Error(errors.array()[0].msg);
      err.httpStatusCode = 422;
      return next(err);
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      const error = new Error("Email not found!");
      error.httpStatusCode = 404;
      return next(error);
    }

    if (!user.isVerified) {
      const error = new Error("Email not verified!");
      error.httpStatusCode = 404;
      return next(error);
    }

    if (!user.password) {
      const err = new Error(
        "You might have used social logins, No password Set"
      );
      err.httpStatusCode = 401;
      return next(err);
    }

    const doMatch = await bcrypt.compare(password, user.password);
    if (!doMatch) {
      const error = new Error("Invalid Credentials");
      error.message = "Incorrect Password";
      error.httpStatusCode = 401;
      return next(error);
    }
    const token = await user.getJwtToken();
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: false,
        path: "/",
        expires: new Date(Date.now() + 3600000),
      })
    );

    return res
      .status(200)
      .json({ status: "SUCCESS", token, message: "Logged in Successfully!" });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  console.log(email);

  const user = await User.findOne({ email });
  try {
    if (!user) {
      const error = new Error("User not found");
      error.httpStatusCode = 404;
      return next(error);
    }

    const forgotToken = user.getForgotPasswordToken();
    await user.save();
    const myUrl = `${process.env.FRONTEND_SERVER_URL}/auth/password/reset/${forgotToken}`;

    const options = {
      email: email,
      subject: "Forgot Password",
      html: `

      Hey there, Please click on the link below to reset your password.

      ${myUrl}

      `,
    };

    await sendMail(options);

    return res.status(200).json({
      status: "SUCCESS",
      message: "Please follow instructions sent on email!",
    });
  } catch (error) {
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();
    const err = new Error("Could not validate Forgot Password Reqesut.");
    err.httpStatusCode = 400;
    return next(err);
  }
};

exports.passwordReset = async (req, res, next) => {
  const { token } = req.params;

  console.log(token, "THis is the token");

  try {
    const encryptedtoken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    console.log(encryptedtoken);

    const user = await User.findOne({
      resetToken: encryptedtoken,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      const err = new Error("Invalid Token or token is expired");
      err.httpStatusCode = 400;
      return next(err);
    }
    if (!req.body.password) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Password is Required" });
    }
    console.log(user);

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    user.password = hashedPassword;

    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;

    await user.save();
    return res
      .status(200)
      .json({ status: "SUCCESS", message: "Email is sent" });
  } catch (error) {
    console.log(error);
    const err = new Error("Password Changed request failed");
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.logout = async (req, res, next) => {
  res.clearCookie("token", { path: "/" });
  return res.redirect(`${process.env.FRONTEND_SERVER_URL}/`);
};

function generateVerificationToken() {
  return crypto.randomBytes(30).toString("hex");
}
