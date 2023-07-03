const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token =
    req.cookies.token ||
    (req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", ""));

  if (!token) {
    const error = new Error("Not Authenticated, Please Login");
    error.httpStatusCode = 401;
    return next(error);
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_KEY);
    if (!decodedToken) {
      const error = new Error("Not Authenticated");
      error.httpStatusCode = 500;
      throw err;
    }
  } catch (error) {
    const e = new Error("Not Authenticated");
    e.httpStatusCode = 401;
    throw e;
  }

  req.userId = decodedToken.userId;
  next();
};
