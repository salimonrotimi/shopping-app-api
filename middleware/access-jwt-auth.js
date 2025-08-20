require("dotenv/config");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const UserSchemaModel = require("../model/user-schema");

const authenticateAccessToken = async (req, res, next) => {
  // First check incase access token is saved in Authorization header
  const authHeader = req.headers.authorization;
  const authHeaderToken = authHeader && authHeader.split(" ")[1]; // grabs token at index 1

  // Get the "accessjwt" cookie from the cookies that are sent when user login.
  const accessTokenCookie = req.cookies.accessjwt; // "accessjwt" is the "res.cookie()" string name
  // declared in the "login" route in "jwt-cookie-setup.js" file.
  const accessTkn = accessTokenCookie || authHeaderToken;
  // if there is no accessTkn
  if (!accessTkn || accessTkn === null) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error_message: "Access token is required. None found." }); // status code 401. // Token not yet received
  }

  try {
    const decodedToken = jwt.verify(accessTkn, process.env.ACCESS_JWT_SECRET);

    if (!decodedToken) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error_message: "Invalid access token." });
    }
    // 'decodeToken' contains "userId", "name" and "type" that are created using the jwt.sign() method
    if (decodedToken.type !== "access") {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error_message: "Invalid token type." });
    }
    // Confirm if the decodeToken 'userId' exist in the database and select the "_id" and "username"
    const result = await UserSchemaModel.findById(decodedToken.userId).select(
      "_id username"
    );
    const { _id: userIdJwtVerified, username: nameJwtVerified } = result; // destructuring the
    // "result" object to get the '_id' and 'username' properties and creating an alias (a new
    // name) for each of them.
    req.user = { userIdJwtVerified, nameJwtVerified }; // Add new object named "user" to the "req"
    // pipeline. It will be destructured from the "req" pipeline anywhere it is used.
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error_message: "Token Expired" });
    }
  }
};

module.exports = authenticateAccessToken;
