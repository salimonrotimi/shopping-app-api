const rateLimit = require("express-rate-limit");

const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in window milliseconds
  max: 10, // limit each IP to 50 requests per windowMs
  message: "Too many refresh attempts, please try again later",
  standardHeaders: true, // optional
  legacyHeaders: false, // optional
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in window milliseconds
  max: 15, // limit each IP to 50 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true, // optional
  legacyHeaders: false, // optional
});

module.exports = { refreshRateLimit, loginRateLimit };
