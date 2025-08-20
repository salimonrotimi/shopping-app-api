// Set cookie header to be sent to the client side after "login" or other authentication

const setTokenCookies = (res, accessTk, refreshTk) => {
  // Access token in HttpOnly Cookie. Expires in 2 hours
  res.cookie("accessjwt", accessTk, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // for cross-site in production
    maxAge: 2 * 60 * 60 * 1000, // Expiry date: 2 hours in milliseconds
    domain: process.env.NODE_ENV === "production" ? undefined : undefined, // let browser set domain
  });
  // Access token in HttpOnly Cookie. Expires in 7 days
  res.cookie("refreshjwt", refreshTk, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Expiry date: 7 days in milliseconds
    domain: process.env.NODE_ENV === "production" ? undefined : undefined, // let browser set domain
  });
};

module.exports = { setTokenCookies };