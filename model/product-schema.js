const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  product_id: {
    type: Number,
  },
  product_title: {
    type: String,
    required: [true, "Product title is required"],
  },
  category: {
    type: String,
    required: [true, "Product category is required"],
    enum: {
      values: ["men", "women", "kids", "couples"],
      message:
        "{VALUE} is does not match any of the categories: men, women, kids, couples",
    },
  },
  new_price: {
    type: Number,
    required: [true, "Product new price is required"],
  },
  old_price: {
    type: Number,
    required: [true, "Product old price is required"],
  },
  available: {
    type: Boolean,
    default: true,
  },
  product_image: {
    type: Buffer,
  },
  image_content_type: {
    type: String,
  },
  image_dimensions: {
    width: Number,
    height: Number,
  },
  image_original_size: {
    type: Number,
  },
  image_processed_size: {
    type: Number,
  },
  upload_date: {
    type: Date,
    default: Date.now,
  },
});

const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;
