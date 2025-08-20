const express = require("express");
const router = express.Router();
const {
  getAllAdmins,
  getAdminById,
  registerAdmin,
  loginAdmin,
  changePassword,
  updateAdminProfile,
  deleteAdminProfile,
  logout,
} = require("../controller/admin_reglogin_controller");

const {
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
} = require("../server-secure/validation-rule-admin");

const {
  validationRuleMiddleware,
} = require("../middleware/validation-rule-midware");

const { loginRateLimit } = require("../login-refresh-rate-limit");

// INDIVIDUAL ROUTES
router.route("/").get(getAllAdmins); // same as  router.get('/', getAllAdmins)

router
  .route("/:id")
  .get(getAdminById)
  .patch(updateAdminProfile)
  .delete(deleteAdminProfile);

router
  .route("/register")
  .post(registerValidationRules(), validationRuleMiddleware, registerAdmin);
router
  .route("/change-password")
  .post(
    forgotPasswordValidationRules(),
    validationRuleMiddleware,
    changePassword
  );

router
  .route("/login")
  .post(
    loginRateLimit,
    loginValidationRules(),
    validationRuleMiddleware,
    loginAdmin
  );

router.route("/logout").post(logout); // same as  router.post('/logout', logout)

module.exports = router;
