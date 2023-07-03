const cookie = require("cookie");

exports.cookieToken = async (user, res, next) => {
  try {
    const token = await user.getJwtToken();
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: false,
        path: "/",
        expires: new Date(Date.now() + 3600000),
      })
    );
    return res.redirect(`${process.env.FRONTEND_SERVER_URL}/`);
  } catch (error) {
    console.log(error);
    const err = new Error("Could not generate Cookie Token");
    err.httpStatusCode = 500;
    next(err);
  }
};
