const { body } = require("express-validator");
// body() creates validation rules for the request body (req.body) fields

// RETURNS AN ARRAY [] OF THE VALIDATED FIELD IN THE CLIENTS "req.body". THE ERROR GENERATED ARE PASSED
// TO THE express-validator validationResult() function used in the "validation-rule-midware.js" file

const registerValidationRules = () => {
  return [
    body("username")
      .isLength({ min: 3, max: 40 })
      .trim()
      .escape()
      .withMessage("Username must be between 3-40 characters."),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*\d)(?=.*[@$#!%*?&])[A-Za-z\d@$#!%*?&]{6,}$/)
      .withMessage(
        "Password must be at least 6 characters and must have a number and a special character."
      ),
    body("confirm_password")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Match error! Passwords do not match");
        }
        return true;
      })
      .withMessage("Match error! Passwords do not match"),
  ]; // digit "\d" and special characters "@$#!%*?&" are required, letters are optional.
};

const loginValidationRules = () => {
  return [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*\d)(?=.*[@$#!%*?&])[A-Za-z\d@$#!%*?&]{6,}$/)
      .withMessage(
        "Password must be at least 6 characters and must have a number and a special character."
      ),
  ]; // digit "\d" and special characters "@$#!%*?&" are required, letters are optional.
};

const forgotPasswordValidationRules = () => {
  return [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*\d)(?=.*[@$#!%*?&])[A-Za-z\d@$#!%*?&]{6,}$/)
      .withMessage(
        "Password must be at least 6 characters and must have a number and a special character."
      ),
    body("confirm_password")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Match error! Passwords do not match");
        }
        return true;
      })
      .withMessage("Match error! Passwords do not match"),
  ]; // digit "\d" and special characters "@$#!%*?&" are required, letters are optional.
};

// In the regex above "?=" means "look ahead for a required character somewhere". It specifies the
// required part and is useful when one does not know the order.
// So (?=.*[a-z]) in the above regex means look ahead for a required character somewhere "?=" any
// single character "." with zero or more occurrence "*" that is between lowercase alphabet "a-z"
// i.e. lowercase letter between a-z is required. Same approach for other parts.

module.exports = {
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
}; // they are not middleware and so do not have the "next()" function. Must be used with function
// brackets "()" e.g. adminValidationRules(), so as to execute immediately wherever they are used.
// They must called be used before the "validate" middleware in "validation-rule-midware"
