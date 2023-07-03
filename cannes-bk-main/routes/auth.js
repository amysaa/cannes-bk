const express = require("express");
const { body } = require("express-validator");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cookie = require("cookie");

const jwt = require("jsonwebtoken");

const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env["GOOGLE_AUTH_CLIENT_ID"],
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = await User.findOne({ email: profile._json.email });
      let newUser;
      if (!user) {
        newUser = await User.create({
          name: `${profile.displayName}`,
          email: profile._json.email,
          isVerified: true,
          provider: "google",
        });
      }
      const userId = user ? user._id : newUser._id;

      const modifiedProfile = {
        ...profile,
        userId,
      };

      done(null, modifiedProfile);
    }
  )
);

const router = express.Router();

router.use(passport.initialize());

const authController = require("../controllers/auth");
const isAuth = require("../middlewares/isAuth");

// POST Login Routes
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid Email").normalizeEmail(),
    body("password", "Invalid Password")
      .trim()
      .isAlphanumeric()
      .isLength({ min: 5, max: 15 }),
  ],
  authController.login
);

// GET LOGOUT
router.get("/logout", authController.logout);

// POST Signup Routes
router.post(
  "/signup",
  [
    body("name")
      .trim()
      .notEmpty()
      .isLength({ min: 3 })
      .withMessage("Invalid Name"),
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
    body("password", "Invalid Password")
      .trim()
      .isAlphanumeric()
      .isLength({ min: 5, max: 15 }),
  ],
  authController.signup
);

router.get("/verify/:token", authController.verifyEmail);

// POST Forgot Password
router.post("/forgot", authController.forgotPassword);

// POST Password Reset
router.post("/password/reset/:token", authController.passwordReset);

// Google Auth Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_SERVER_URL}/auth/login`,
    session: false,
    successMessage: true,
  }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user.userId.toString() },
      process.env.JWT_KEY,
      {
        expiresIn: "1h",
      }
    );

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(Date.now() + 3600000),
      })
    );
    return res.redirect(`${process.env.FRONTEND_SERVER_URL}/`);
  }
);

// Google Auth Ends

// GET Get user profile
router.get("/user", isAuth, authController.fetchProfile);

module.exports = router;
