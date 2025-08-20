const jwt = require("jsonwebtoken");

const checkAccessTokenRefresh = (req, res, next) => {
  const accessTokenCookie = req.cookies.accessjwt;
  // if accessTTokenCookie exist, decode it, get its time before expiry and request token refresh
  if (accessTokenCookie) {
    try {
      // Decode the token to get the expiry time "exp" of the token. Verification is not needed
      const decode = jwt.decode(accessTokenCookie);
      // Get the remaining time before expiry by converting the expiry time "exp" (in seconds)
      // to milliseconds (* 1000) and removing the current time.
      const timeBeforeExpiry = decode.exp * 1000 - Date.now();
      // if time before expiry is less than 5 minutes, set header for the need for token refresh
      if (timeBeforeExpiry < 2 * 60 * 1000) {
        res.set("X-Token-Refresh-Required", "true");
      }
    } catch (error) {
      console.log("Could not set access token timeout.");
    }
  }
  next();
};

module.exports = { checkAccessTokenRefresh };
