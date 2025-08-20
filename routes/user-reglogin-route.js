const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  register,
  login,
  dashboard,
  addProductToCart,
  removeFromCart,
  cartTotal,
  updateProfile,
  deleteProfile,
  refreshTokenJWT,
  logout,
  logout_all,
  changePassword,
} = require("../controller/user_reglogin_controller");

const {
  refreshRateLimit,
  loginRateLimit,
} = require("../login-refresh-rate-limit");

const {
  checkAccessTokenRefresh,
} = require("../middleware/check-access-jwt-refresh");

const accessTokenAuthMiddleware = require("../middleware/access-jwt-auth");

const {
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
} = require("../server-secure/validation-rule-user");

const {
  validationRuleMiddleware,
} = require("../middleware/validation-rule-midware");

// INDIVIDUAL ROUTES
router.route("/").get(getAllUsers); // same as  router.get('/', getAllUsers)
router
  .route("/:id")
  .get(checkAccessTokenRefresh, accessTokenAuthMiddleware, getUserById)
  .patch(checkAccessTokenRefresh, accessTokenAuthMiddleware, updateProfile)
  .delete(checkAccessTokenRefresh, accessTokenAuthMiddleware, deleteProfile);

router
  .route("/dashboard")
  .get(checkAccessTokenRefresh, accessTokenAuthMiddleware, dashboard);
// same as router.get('/dashboard', checkAccessTokenRefresh, authTokenMiddleware, dashboard)

router
  .route("/addtocart")
  .post(checkAccessTokenRefresh, accessTokenAuthMiddleware, addProductToCart);
// Done by user. It requires authentication of user.
router
  .route("/removefromcart")
  .post(checkAccessTokenRefresh, accessTokenAuthMiddleware, removeFromCart);
router
  .route("/cart-total")
  .post(checkAccessTokenRefresh, accessTokenAuthMiddleware, cartTotal);

router
  .route("/register")
  .post(registerValidationRules(), validationRuleMiddleware, register); // same as  router.post('/register', register)

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
    login
  ); // same as  router.post('/login', login)

router.route("/refresh-token").post(refreshRateLimit, refreshTokenJWT);
// same as  router.post('/refresh-token', refreshRateLimit, refreshTokenJWT)
router.route("/logout").post(logout); // same as  router.post('/logout', logout)
router.route("/logout-all").post(logout_all); // same as  router.post('/logout-all', logout_all)

module.exports = router;
