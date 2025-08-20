const { StatusCodes } = require("http-status-codes");
const { processImage } = require("../image-processing");
const ProductSchemaModel = require("../model/product-schema");
const sharp = require("sharp");

// ALL HANDLERS OR CONTROLLERS ARE FOR THE "ADMIN" EXCEPT FOR "addProductToCart()" WHICH IS FOR "USER"

// Convert each of the resulting image "item" to object and target the "product_image" for conversion
// to base64 string so that it can be automatically read by the <img> tag at the frontend
function productImageConverter(imageList) {
  const imageData = imageList.map((item) => {
    const itemObject = item.toObject();

    if (itemObject.product_image && itemObject.image_content_type) {
      const base64Image = itemObject.product_image.toString("base64");
      // pass the coverted base64 string back to the "itemObject.product_image" as a data format
      itemObject.product_image = `data:${itemObject.image_content_type};base64,${base64Image}`;
    }
    return itemObject;
  });

  return imageData;
}

// UPLOAD PRODUCT:
const uploadProductToDB = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error_message: "No image file provided" });
    }
    // call the processImage() function on the image uploaded to get the buffer
    const processedProductImageBuffer = await processImage(req.file.buffer);

    // Get processed product image metadata i.e. width and height
    const metadata = await sharp(processedProductImageBuffer).metadata();

    // AUTO-INCREMENT "product_id" for each product creation
    const all_products = await ProductSchemaModel.find({});
    let id;
    if (all_products.length > 0) {
      const last_product_array = all_products.slice(-1); //picks last prod as array of obj [{}]
      const last_product_item = last_product_array[0]; // removes the item {}, discard the []
      id = last_product_item.product_id + 1; // get the product_id and increment by 1
    } else {
      id = 1; // if the all product length is empty (i.e. < 1), assign id as 1
    }

    // Prepare the product document to be stored in the database
    const productDetails = {
      product_id: id,
      product_title: req.body.product_title,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      available: req.body.available,
      product_image: processedProductImageBuffer,
      image_content_type: req.file.mimetype,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      image_original_size: req.file.size,
      image_processed_size: processedProductImageBuffer.length,
    };
    // Create the image document in the database
    const result = await ProductSchemaModel.create(productDetails);

    if (!result) {
      return res
        .status(StatusCodes.NO_CONTENT)
        .json({ error_message: "Product upload failed." });
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Product uploaded successfully.",
      productId: result.product_id,
      original_size: Math.round(result.image_original_size / 1024) + "KB",
      processed_size: Math.round(result.image_processed_size / 1024) + "KB",
    });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error_message: "Product upload failed." });
  }
};

// GET ALL PRODUCTS
const getAllProducts = async (req, res) => {
  try {
    const results = await ProductSchemaModel.find({})
      .select(
        // "_id" is selected in MongoDB by default, "-_id" means dont select "_id"
        "-_id product_id product_title category old_price new_price product_image image_content_type"
      )
      .sort({
        upload_date: -1, // -1 means sort order from the last to the first
      });

    if (!results) {
      return res.status(404).json({ error_message: "No product found" });
    }

    // conversion of product image to base64 string so that it can be read by the <img> tag at the frontend
    const final_results = productImageConverter(results);

    res.json({
      success: true,
      message: "All products retrieved successfully.",
      final_results,
    });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error_message: "Error retrieving images." });
  }
};

// GET NEW STOCKS (LAST 8 ITEMS EXCLUDING THE FIRST ITEM)
const getNewStocks = async (req, res) => {
  try {
    const results = await ProductSchemaModel.find({}).select(
      "-_id product_id product_title category old_price new_price product_image image_content_type"
    );

    if (!results) {
      return res
        .status(404)
        .json({ error_message: "No product found in database." });
    }

    // Get the last 8 items from the "results" excluding the first item
    const newStocks = results.slice(1).slice(-8);

    if (!newStocks) {
      return res
        .status(404)
        .json({ error_message: "No product new stocks found." });
    }

    // conversion of product image to base64 string so that it can be read by the <img> tag at the frontend
    const final_results = productImageConverter(newStocks);

    res.json({
      success: true,
      message: "New product collections retrieved successfully.",
      final_results,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error_message: "Error retrieving new product collections.",
    });
  }
};

// GET COMMON AMONG WOMEN (TOP 4 ITEMS)
const getCommonAmongWomen = async (req, res) => {
  try {
    const results = await ProductSchemaModel.find({ category: "women" }).select(
      "-_id product_id product_title category old_price new_price product_image image_content_type"
    );

    if (!results) {
      return res
        .status(404)
        .json({ error_message: "No product found for women in database." });
    }

    // Get top 4 items from the "results"
    const commonForWomen = results.slice(0, 4);

    if (!commonForWomen) {
      return res
        .status(404)
        .json({ error_message: "No common product found for women." });
    }

    // conversion of product image to base64 string so that it can be read by the <img> tag at the frontend
    const final_results = productImageConverter(commonForWomen);

    res.json({
      success: true,
      message: "New product collections retrieved successfully.",
      final_results,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error_message: "Error retrieving new product collections. ",
    });
  }
};

//  GET PRODUCT BY product_id:
const getProductById = async (req, res) => {
  try {
    const result = await ProductSchemaModel.findOne({
      product_id: req.params.id, // id is passed from params field and declared in "routes" folder files
    }).select(
      "product_id product_title category old_price new_price product_image image_content_type"
    );
    // OR const result = await ProductSchemaModel.findById(req.params.product_id).select("...");

    if (!result) {
      return res
        .status(404)
        .json({ error_message: "No product found with given id" });
    }

    // Convert the result to object and target the "product_image" for conversion
    // to base64 string so that it can be automatically read by the <img> tag at the frontend

    const resultObject = result.toObject();

    if (resultObject.product_image && resultObject.image_content_type) {
      const base64Image = resultObject.product_image.toString("base64");
      // pass the coverted base64 string back to the "resultObject.product_image" as a data format
      resultObject.product_image = `data:${resultObject.image_content_type};base64,${base64Image}`;
    }

    res.json({
      success: true,
      message: "Product with given id retrieved successfully.",
      resultObject,
    });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error_message: "Error retrieving image." });
  }
};

// Update Product endpoint
const updateProduct = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error_message: "No image file provided" });
    }

    if (req.params.id !== req.body.product_id) {
      return res.status(StatusCodes.CONFLICT).json({
        error_message: "ID mismatch between body and parameter field",
      });
    }
    // call the processImage() function
    const processedProductImageBuffer = await processImage(req.file.buffer);

    // Get processed product image metadata i.e. width and height
    const metadata = await sharp(processedProductImageBuffer).metadata();

    // Prepare the product document to be stored in the database
    const updateProductDetails = {
      product_id: req.body.product_id,
      product_title: req.body.product_title,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      available: req.body.available,
      product_image: processedProductImageBuffer,
      image_content_type: req.file.mimetype,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      image_original_size: req.file.size,
      image_processed_size: processedProductImageBuffer.length,
    };

    // update with the "product_id" from the "params" request
    const result = await ProductSchemaModel.findOneAndUpdate(
      {
        product_id: req.params.id,
      },
      updateProductDetails,
      { new: true, runValidators: true }
    );
    // OR const result = await ProductSchemaModel.findByIdAndUpdate(req.params.id, updateProductDetails, { new: true, runValidators: true });

    if (!result) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error_message: "No product found with the given id" });
    }
    res.json({
      success: true,
      message: "Image updated successfully",
      original_size: Math.round(result.image_original_size / 1024) + "KB",
      processed_size: Math.round(result.image_processed_size / 1024) + "KB",
    });
  } catch (err) {
    res.json({ error_message: "Error updating image." });
  }
};

// Delete Product endpoint (with "product_id" in request params)
const deleteProduct = async (req, res) => {
  try {
    const { id: paramsId } = req.params; // destructuring of "req.params" object and aliasing

    // get the "product_id" from the "params" request
    const result = await ProductSchemaModel.findOneAndDelete({
      product_id: paramsId,
    });
    // OR const result = await ProductSchemaModel.findByIdAndDelete(req.params.id);
    if (!result) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error_message: "No product found with the given id" });
    }
    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error_message: "Error deleting product." });
  }
};

// UPLOAD IMAGE TO SERVER ENVIRONMENT, BUT WILL NOT BE USED FOR THIS PROJECT
const uploadProductImageToServer = async (req, res) => {
  try {
    if (req.file.filename) {
      // "req.file.filename" will be passed from the "uploadFileToServerMulter" function in the
      // file-upload.js middleware after the image has uploaded successfully.
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Image uploaded successfully",
        url: `http://localhost:4000/api/auth/server/uploaded/${req.file.filename}`,
      });
    }
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error_message: "Upload failed. Something went wrong..." });
  }
};

module.exports = {
  uploadProductToDB,
  getAllProducts,
  getNewStocks,
  getCommonAmongWomen,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImageToServer,
};
