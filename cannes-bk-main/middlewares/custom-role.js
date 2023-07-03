const User = require("../models/user");

exports.customRole = (...roles) => {
  return async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (!roles.includes(user.role)) {
      const err = new Error("You are not allowed for this resource");
      err.httpStatusCode = 403;
      return next(err);
    }
    next();
  };
};
