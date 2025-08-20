require("dotenv").config();
const mongoose = require("mongoose");
const { StatusCodes } = require("http-status-codes");
const AdminSchemaModel = require("../model/admin-schema");
const { maskEmail } = require("./user_reglogin_controller"); // for masking email

const objectId = mongoose.Types.ObjectId;

// THE ADMIN ROUTE DOES NOT USE "JWT". THUS, IT THUS NOT REQUIRE "COOKIES"

// For getting all admins
const getAllAdmins = async (req, res) => {
  try {
    const results = await AdminSchemaModel.find({}).select("username email");
    if (!results) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: "No record found.",
      });
    }
    // Get the "email" from the results array and mask it before sending it to the client side
    results.forEach((item) => {
      item.email = maskEmail(item.email);
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Records retrieved successfully.",
      results,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error retrieving registered users.",
    }); // status code 500
  }
};

const getAdminById = async (req, res) => {
  const { id: paramsId } = req.params; // nested destructuring of req.params object

  if (!objectId.isValid(paramsId)) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      error_message: `The id ${paramsId} is not a valid mongoose id.`,
    });
  }
  try {
    const result = await AdminSchemaModel.findOne({ _id: paramsId }).select(
      "-password -updatedAt"
    );
    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: `No record found with given id: ${paramsId}`,
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Records retrieved successfully.",
      result,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error retrieving registered users.",
    }); // status code 500;
  }
};

// REGISTER: uses the post method. Tokens are not required during registration
const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Username, email and password are required to register.",
      });
    }

    const emailExist = await AdminSchemaModel.findOne({ email });

    if (emailExist) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email already in use.",
      });
    }

    const result = await AdminSchemaModel.create({ username, email, password });
    if (!result) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        error_message: "Admin registration failed.",
      });
    }

    res.status(StatusCodes.CREATED).json({
      // status code 201
      success: true,
      message: "Admin registered successfully.",
      user: {
        id: result._id,
        username: result.username,
        email: maskEmail(result.email),
      },
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error registering Admin.",
    });
  }
};

// LOGIN
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body; // destructuring of the "req.body" object

    if (!email || !password) {
      // status code 400
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Please provide email and password to login.",
      });
    }

    const result = await AdminSchemaModel.findOne({ email }); // 'result' is the instance of the
    // schema and it contains the fields (such as username, email, password) and schema instance
    // methods such as comparePassword() and createJWT().

    // if admin does not exist
    if (!result) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email is incorrect or does not exist.",
      }); // status code 400
    }
    // Compare candidate "password" with existing password in the database if the user email exist.
    const validPassword = await result.comparePassword(password); // calling the schema instance method

    // This approach is used if the 'Schema instance method' for comparing password is not declared already
    // const validPassword = await bcrypt.compare(password, result.password);

    if (!validPassword) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Email exist but password is not correct.",
      });
    }

    res.status(StatusCodes.OK).json({
      // status code 200
      success: true,
      message: "Admin login successful",
      admin: {
        username: result.username,
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error logging in...",
    });
  }
};

// CHANGE PASSWORD: uses the post method. Tokens are not required during registration
const changePassword = async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Password does not match",
      });
    }

    if (!email || !password || !confirm_password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email and password are required for password update.",
      });
    }

    const emailExistResult = await AdminSchemaModel.findOne({ email });

    if (!emailExistResult) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email does not exist.",
      });
    }

    // add the new password to the database "password" field of the existing "email"
    emailExistResult.password = password;

    await emailExistResult.save(); // save the added new password in the database. This ensures the
    // password is hashed upon saving. Do not use any "update" query as it does not hash the password.

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password change successfully.",
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error changing password.",
    });
  }
};

//UPDATE BY id:
const updateAdminProfile = async (req, res) => {
  const { id: paramsId } = req.params; // nested destructuring of "req.params" object

  if (!objectId.isValid(paramsId)) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      error_message: `The id ${paramsId} is not a valid mongoose id.`,
    });
  }

  // the data to be updated from the react form is in 'req.body'.
  try {
    const result = await AdminSchemaModel.findOneAndUpdate(
      { _id: paramsId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: `No admin record found with given id: ${paramsId}`,
      });
    }

    res.status(StatusCodes.CREATED).json({
      // status code 201
      success: true,
      message: "Admin record updated successfully.",
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error updating admin record.",
    });
  }
};

// DELETE request:          uses "res.send" which set response "res" header to "text/html"
const deleteAdminProfile = async (req, res) => {
  const { id: paramsId } = req.params; // nested destructuring of "req.params" object

  if (!objectId.isValid(paramsId)) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(`The id ${paramsId} is not a valid mongoose id.`);
  }

  try {
    const result = await AdminSchemaModel.findOneAndDelete({ _id: paramsId });
    if (!result) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(`No admin record found with given id: ${paramsId}`);
    }

    res.status(StatusCodes.OK).send("Admin Record deleted successfully.");
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error deleting record. " + err);
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    const { username } = req.body;

    const result = await AdminSchemaModel.findOne({ username });

    if (!result) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Could not logout as you have not login.",
      }); // status code 401
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (err) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Error logging out... ",
    });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  registerAdmin,
  loginAdmin,
  changePassword,
  updateAdminProfile,
  deleteAdminProfile,
  logout,
};
