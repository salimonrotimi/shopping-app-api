require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const mongodbConn = require("../dbconnection");
const UserSchemaModel = require("../model/user-schema");
const { setTokenCookies } = require("../jwt-cookie-setup");

const objectId = mongoose.Types.ObjectId;

mongodbConn(); // First connect once to the database before performing CRUD operation with the imported
// schema. This connection is used across all the different handlers/controllers and routes.

// function to mask the email since it is very important
function maskEmail(email) {
  const [userpart, domainName] = email.split("@");
  if (userpart.length <= 2) {
    return `${userpart[0]}***@${domainName}`;
  }
  return `${userpart.slice(0, 2)}${"*".repeat(
    userpart.length - 2
  )}${userpart.slice(-1)}@${domainName}`;
}

// create new "cart" for user when user registers and user logout_all
let cart = {};
for (let i = 0; i < 300; i++) {
  cart[i] = 0;
}

// For getting all users
const getAllUsers = async (req, res) => {
  try {
    const results = await UserSchemaModel.find({}).select("username email");
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

const getUserById = async (req, res) => {
  const {
    user: { userIdJwtVerified },
    params: { id: paramsId },
  } = req; // nested destructuring of "req" object req.params is used to access parameter passed in a URL

  if (!objectId.isValid(paramsId)) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      error_message: `The id ${paramsId} is not a valid mongoose id.`,
    });
  }
  try {
    const result = await UserSchemaModel.findOne({ _id: paramsId }).select(
      "-password -updatedAt"
    );
    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: `No record found with given id: ${paramsId}`,
      });
    }
    // confirm if it is the actual user by comparing the ids
    if (result._id !== userIdJwtVerified) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "You need to login to view your records.",
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
const register = async (req, res) => {
  try {
    // Use this approach if the "password" field is not already hashed using the Schema.pre() middleware
    // const { username, email, password } = req.body; // destructuring of the "req.body" object

    // const salt = await bcrypt.genSalt(10); // Generate a 'salt' and use it to hash the password
    // const hashedPassword = await bcrypt.hash(password, salt);

    // reconstruct the request body object to have the hashed password
    // const requestBody = { username, email, password: hashedPassword }
    // const result = await UserSchemaModel.create(requestBody);

    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Username, email and password are required to register.",
      });
    }

    const emailExist = await UserSchemaModel.findOne({ email: req.body.email });

    if (emailExist) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email already in use.",
      });
    }

    // add a new field "cartData" to the "req.body" object with "cart" declare as value
    req.body.cartData = cart;

    const result = await UserSchemaModel.create(req.body); // password is hashed in the process by the Schema.pre() middleware
    // the 'req.body' object can also be unpacked into a new object as {...req.body} the code becomes:
    // const result = await UserSchemaModel.create({...req.body});
    if (!result) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        error_message: "User registration failed.",
      });
    }

    res.status(StatusCodes.CREATED).json({
      // status code 201
      success: true,
      message: "User registered successfully",
      user: {
        id: result._id,
        username: result.username,
        email: result.email,
      },
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error registering user.",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body; // destructuring of the "req.body" object

    if (!email || !password) {
      // status code 400
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Please provide email and password to login.",
      });
    }

    const result = await UserSchemaModel.findOne({ email }); // 'result' is the instance of the schema and
    // it contains the fields (such as username, email, password, cartData, refreshToken) and schema
    // instance methods such as comparePassword() and createJWT().

    // if user does not exist
    if (!result) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error_message: "Email is incorrect or does not exist.",
      }); // status code 400
    }
    // Compare candidate "password" with existing password in the database if the user email exist.
    const validPassword = await result.comparePassword(password); // calling the schema instance method

    // Use this approach if the 'Schema instance method' for comparing password is not declared already
    // const validPassword = await bcrypt.compare(password, result.password);

    if (!validPassword) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Email exist but password is not correct.",
      });
    }

    // if user exist and login authencation is successful, get device id and create token.
    // "deviceId" is generated from the client's side (user's side) and sent to the server. if no
    // "deviceId" is received by the server it generates its own.
    const userDeviceId = deviceId || `device_${Date.now()}`;
    const { accessToken, refreshToken } = result.createJWT(userDeviceId); // calling the
    // schema instance method on the "result" instance and catching/unpacking the returned values
    // from the "createJWT()" schema instance method.

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in millisec.
    // save the "refreshToken" in the database for future use using the schema instance 'result'
    result.refreshToken = {
      token: refreshToken,
      deviceId: userDeviceId,
      expiresAt: refreshTokenExpiry,
    };

    await result.save(); // save the added refreshToken in the database

    // Set cookie header to be sent to the client side before sending the final json result
    setTokenCookies(res, accessToken, refreshToken);

    res.status(StatusCodes.OK).json({
      // status code 200
      success: true,
      message: "Login successful",
      user: {
        username: result.username,
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error logging in... ",
    });
  }
};

// CHANGE PASSWORD: uses the post method. Tokens are not required during password change
const changePassword = async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;

    console.log(email, "\n", password, "\n", confirm_password);

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

    const emailExistResult = await UserSchemaModel.findOne({ email });

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

// USER DASHBOARD
const dashboard = async (req, res) => {
  console.log(req.user); // points to the 'req.user' from the authenticateAccessToken() middleware
  res.status(StatusCodes.OK).json({
    success: true,
    message: `Welcome ${req.user.nameJwtVerified}, your id is ${req.user.userIdJwtVerified}`,
  });
};

// ADD PRODUCT TO CART. Controlled by User and requires user to be authenticated before access.
const addProductToCart = async (req, res) => {
  // Nested destructuring of "req" object
  const {
    user: { userIdJwtVerified }, // the 'req.user' from the authenticateAccessToken() middleware
    body: { itemId },
  } = req;

  // check if user records exist in the database with the verified id
  let checkResult = await UserSchemaModel.findOne({ _id: userIdJwtVerified });

  if (!checkResult) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "No record found. Kindly login to proceed.",
    });
  }
  // increment the value of the "cartData" at a key position using the "itemId" as the key
  checkResult.cartData[itemId] += 1;

  // For the authenticated user, update the "cartData" field with the incremented value
  try {
    const result = await UserSchemaModel.findOneAndUpdate(
      { _id: userIdJwtVerified },
      { cartData: checkResult.cartData }
    );

    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: "Item could not be added to cart due to invalid id",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Item added to cart successfully.",
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error adding item to cart.",
    });
  }
};

// REMOVE FROM CART. Controlled by User and requires user to be authenticated before access.
const removeFromCart = async (req, res) => {
  // Nested destructuring of "req" object
  const {
    user: { userIdJwtVerified }, // the 'req.user' from the authenticateAccessToken() middleware
    body: { itemId },
  } = req;

  // check if user records exist in the database with the verified id
  let checkResult = await UserSchemaModel.findOne({ _id: userIdJwtVerified });

  if (!checkResult) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "No record found. Kindly login to proceed.",
    });
  }
  // decrease the value of the "cartData" at a key position using the "itemId" as the key
  if (checkResult.cartData[itemId] > 0) {
    checkResult.cartData[itemId] -= 1;
  }

  // For the authenticated user, update the "cartData" field with the incremented value
  try {
    const result = await UserSchemaModel.findOneAndUpdate(
      { _id: userIdJwtVerified },
      { cartData: checkResult.cartData }
    );

    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: "Item could not be removed from cart due to invalid id",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Item removed from cart successfully.",
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error removing item from cart.",
    });
  }
};

// CART TOTAL. Requires user authentication before access. Shows the total number of items in cart
const cartTotal = async (req, res) => {
  try {
    // Destructuring of "req.user" object
    const { userIdJwtVerified } = req.user; // the 'req.user' from the authenticateAccessToken() middleware

    // check if user records exist in the database with the verified id
    const checkResult = await UserSchemaModel.findOne({
      _id: userIdJwtVerified,
    });

    if (!checkResult) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "No record found. Kindly login to proceed.",
      });
    }

    // Get the "cadrtData from the "checkResult" object
    const result = checkResult.cartData;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Total cart records retrieved successfully.",
      result,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error retrieving total items in cart.",
    });
  }
};

//UPDATE BY id:
const updateProfile = async (req, res) => {
  const {
    user: { nameJwtVerified },
    params: { id: paramsId },
  } = req; // nested destructuring of "req" object
  // req.params is used to access parameter passed in a URL
  if (!objectId.isValid(paramsId)) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      error_message: `The id ${paramsId} is not a valid mongoose id.`,
    });
  }

  const checkResult = await UserSchemaModel.findOne({ _id: paramsId }).select(
    "username"
  );

  // confirm if it is the actual user by comparing the name from the authentication and that of username in the database
  if (nameJwtVerified !== checkResult.username) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "You need to login to update your records.",
    });
  }

  // the data to be updated from the react form is in 'req.body'.
  try {
    const result = await UserSchemaModel.findOneAndUpdate(
      { _id: paramsId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error_message: `No record found with given id: ${paramsId}`,
      });
    }

    res.status(StatusCodes.CREATED).json({
      // status code 201
      success: true,
      message: "Record updated successfully.",
    });
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error_message: "Error updating record.",
    });
  }
};

// DELETE request:          uses "res.send" which set response "res" header to "text/html"
const deleteProfile = async (req, res) => {
  const {
    user: { nameJwtVerified },
    params: { id: paramsId },
  } = req; // nested destructuring of "req" object
  // req.params is used to access parameter passed in a URL
  if (!objectId.isValid(paramsId)) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(`The id ${paramsId} is not a valid mongoose id.`);
  }

  const checkResult = await UserSchemaModel.findOne({ _id: paramsId }).select(
    "username"
  );
  // confirm if it is the actual user by comparing the username in the database and that of authentication
  if (nameJwtVerified !== checkResult.username) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .send("You need to login to delete your records.");
  }

  try {
    const result = await UserSchemaModel.findOneAndDelete({ _id: paramsId });
    if (!result) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(`No record found with given id: ${paramsId}`);
    }

    res.status(StatusCodes.OK).send("Record deleted successfully.");
  } catch (err) {
    // catch all the errors that may occur in the 'try' block
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error deleting record.");
  }
};

// NEW REFRESH TOKEN GENERATOR
const refreshTokenJWT = async (req, res) => {
  // Get the refresh token from the request cookies
  const refreshTokenCookie = req.cookies.refreshjwt;

  if (!refreshTokenCookie || refreshTokenCookie === "") {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Refresh token required.",
    });
  }
  try {
    // 'decodeToken' contains "userId", "name", "deviceIdentity" and "type" that are created using the jwt.sign() method
    const decodeToken = jwt.verify(
      refreshTokenCookie,
      process.env.REFRESH_JWT_SECRET
    );
    if (decodeToken.type !== "refresh") {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Invalid token type.",
      });
    }
    // Confirm if the decodeToken 'userId' and the refreshTokenCookie exist in the database
    const result = await UserSchemaModel.findOne({
      _id: decodeToken.userId,
      "refreshToken.token": refreshTokenCookie,
    }); // 'result' contains all the fields and the schema instance methods

    if (!result) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "User not found.",
      }); // status code 401
    }

    if (refreshTokenCookie !== result.refreshToken.token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Invalid refresh token.",
      });
    }

    // Generate new "tokens" (to grab the accessToken and refreshToken) with the 'result' schema instance
    const { accessToken, refreshToken: newRefreshToken } = result.createJWT(
      decodeToken.deviceIdentity
    );
    // calling the schema instance method on the "result" instance and catching the returned values
    // from the "createJWT()" schema instance method. refreshToken is renamed newRefreshToken

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in millisec.
    // save the "refreshToken" in the database for future use using the schema instance 'result'
    result.refreshToken = {
      token: newRefreshToken,
      deviceId: userDeviceId,
      expiresAt: refreshTokenExpiry,
    };

    await result.save(); // save the added refreshToken in the database

    // Set cookie header to be sent to the client side before sending the final json result
    setTokenCookies(res, accessToken, newRefreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Tokens refreshed successfully. New tokens generated.",
    });
  } catch (err) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: true,
      error_message: "Error generating tokens... ",
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  // Get the refresh token from the request body
  // points to the 'req.user' from the authenticationToken() middleware
  const { refreshjwt } = req.cookies; // destructuring of the 'req.cookies' object

  if (!refreshjwt || refreshjwt === "") {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Refresh token required.",
    });
  }
  try {
    // decode the token to get the "userId" using "jwt.decode()" since no need to verify logout
    const decodedToken = jwt.decode(refreshjwt);
    // find the refreshToken "token" and others and set them to "null" to prevent future use.
    const result = await UserSchemaModel.findOneAndUpdate(
      {
        _id: decodedToken.userId,
        "refreshToken.token": refreshjwt,
      },
      {
        $set: {
          "refreshToken.token": null,
          "refreshToken.createdAt": null,
          "refreshToken.expiresAt": null,
        },
      }
    );

    if (!result) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Invalid refresh token",
      }); // status code 401
    }

    // set the header to clear the existing cookie on the client side
    res.clearCookie("accessjwt");
    res.clearCookie("refreshjwt");

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Logout "${result.username}" from this device successfully.`,
    });
  } catch (err) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Error logging out...",
    });
  }
};

// LOGOUT FROM ALL DEVICES
const logout_all = async (req, res) => {
  // Get the refresh token from the request body
  const { refreshjwt } = req.cookies; // destructuring of the 'req.cookies' object

  if (!refreshjwt || refreshjwt === "") {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Refresh token required.",
    });
  }
  try {
    // decode the token to get the "userId"
    const decodedToken = jwt.decode(refreshjwt);
    // find the refreshToken and set it to {}, which clears its records and prevent future use.
    const result = await UserSchemaModel.findOneAndUpdate(
      {
        _id: decodedToken.userId,
        "refreshToken.token": refreshjwt,
      },
      { $set: { refreshToken: {}, cartData: cart } }
    );

    if (!result) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error_message: "Invalid refresh token",
      }); // status code 401
    }
    // set the header to clear the existing cookie on the client side
    res.clearCookie("accessjwt");
    res.clearCookie("refreshjwt");

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Logout "${result.username}" successful. Your cart has been cleared. `,
    });
  } catch (err) {
    console.error("Error logging out... " + err);
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error_message: "Error logging out... ",
    });
  }
};

module.exports = {
  maskEmail,
  getAllUsers,
  getUserById,
  register,
  login,
  changePassword,
  dashboard,
  addProductToCart,
  removeFromCart,
  cartTotal,
  updateProfile,
  deleteProfile,
  refreshTokenJWT,
  logout,
  logout_all,
};
