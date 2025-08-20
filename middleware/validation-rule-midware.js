const { StatusCodes } = require("http-status-codes");
const { validationResult } = require("express-validator");
// validationResult() extracts validation error from the request "req" object.

const validationRuleMiddleware = (req, res, next) => {
  const errors = validationResult(req); // the "errors" variable is populated by the errors
  // generated in the express-validator "body()" function in validation-rule.jsx file for the
  // request "req".

  if (!errors.isEmpty()) {
    // if there are validation errors, return them to the client
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error_message: errors.array(), // convert errors to array format.
    });
  }

  // if there is no error, proceed to the next middleware or route controller or handler
  next();
};

module.exports = { validationRuleMiddleware };
