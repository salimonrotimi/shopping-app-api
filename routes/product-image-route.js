const express = require("express");
const router = express.Router();

const {
  uploadFileToDBMulter,
  uploadFileToServerMulter,
} = require("../middleware/file-upload");

const {
  uploadProductToDB,
  getAllProducts,
  getNewStocks,
  getCommonAmongWomen,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImageToServer,
} = require("../controller/product_image_controller");

const {
  productValidationRules,
} = require("../server-secure/validation-rule-admin");
const {
  validationRuleMiddleware,
} = require("../middleware/validation-rule-midware");

// INDIVIDUAL ROUTES
// upload to database route
router
  .route("/upload")
  .post(
    uploadFileToDBMulter.single("image"),
    productValidationRules(),
    validationRuleMiddleware,
    uploadProductToDB
  ); // same as  router.post('/upload', uploadFileMulter.single("image"), uploadproductToDB);
// If authentication (auth) is required before upload, then the order is as follows:
//    router.route("/upload").post(auth, uploadFileMulter.single("image"), uploadProductToDB);

router.route("/").get(getAllProducts);
router.route("/newstocks").get(getNewStocks);
router.route("/common-in-women").get(getCommonAmongWomen);

router
  .route("/:id")
  .get(getProductById)
  .put(
    uploadFileToDBMulter.single("image"),
    productValidationRules(),
    validationRuleMiddleware,
    updateProduct
  )
  .delete(deleteProduct);

// UPLOAD TO SERVER ROUTE
router
  .route("/server-env/upload")
  .post(uploadFileToServerMulter.single("image"), uploadProductImageToServer);

module.exports = router;
