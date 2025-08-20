const { sanitizeObject } = require("../server-secure/input-sanitizer");

// MIDDLEWARE TO USE THE SANITIZE INPUT AND OBJECT FROM THE "input-sanitizer.js" FILE ON THE ROOT
// PAGE "index.js" file.

// sanitize request "req" objects from client using the imported "sanitizeObject()" function. The
// "sanitizeObject()" calls or make use of the "sanitizeInput()" in its function body.
const sanitizeRequest = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(req.body);
  }

  if (req.params && Object.keys(req.params).length > 0) {
    req.params = sanitizeObject(req.params);
  }

  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = sanitizeRequest; // exported as "object". It can be called with any variable
// name e.g. "requestSanitizer" in "index.js" file. If exported as a function i.e. {sanitizeRequest},
// it must be called exactly the same way as {sanitizeRequest} in "index.js" file
