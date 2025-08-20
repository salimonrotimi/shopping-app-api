const { JSDOM } = require("jsdom");
const DOMPurify = require("dompurify");
const window = new JSDOM("").window;
const purify = DOMPurify(window);

// CLEANS THE INPUT FROM THE CLIENT SIDE UPON ARRIVAL TO THE index.js file. IT IS USED BY THE
// "sanitizeRequest" MIDDLEWARE IN "input-sanitizer-midware.js" file.

// Sanitization function for user "input" from the client side that are "string"
const sanitizeInput = (input) => {
  // Return input from client back to the client if it is not "string". HTML forms send "string"
  // data by default to the server.
  if (typeof input !== "string") {
    return input;
  }
  // If "string" input, remove HTML tags and sanitize with "purify" i.e. the DOMPurify variable
  // Encoding are handled automatically in the process.
  return purify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

// Sanitization function for user "input" from the client side that are "object". e.g. "req.body"
const sanitizeObject = (inputVal) => {
  // if the "inputVal" is null or not an object
  if (inputVal === null || typeof inputVal !== "object") {
    // if the "inputVal" is a string call the sanitizeInput() function above to sanitize it. If it
    // is not a string, return it.
    const result =
      typeof inputVal === "string" ? sanitizeInput(inputVal) : inputVal;
    return result;
  }

  // if "inputVal" is an array i.e. [], process each element of the array by recursively calling the
  // "sanitizeObject" function from the top. The
  // "sanitizeObject" becomes the callback function that is used by the ".map()" array method.
  if (Array.isArray(inputVal)) {
    return inputVal.map(sanitizeObject); // i.e. inputValue.map( (inputVal)=>{...} );
  }

  // if "inputVal" is an object i.e. {} with key-value pair
  const sanitized = {};
  for (const key in inputVal) {
    // if "inputVal" object has a property (i.e. key), then recursively call sanitizeObject() function
    // from the top passing the string value from the "inputVal[key]" to it.
    if (
      (key === "password" && inputVal.hasOwnProperty(key)) ||
      (key === "confirm_password" && inputVal.hasOwnProperty(key))
    ) {
      sanitized[key] = inputVal[key];
    } else {
      sanitized[key] = sanitizeObject(inputVal[key]);
    }
  }
  return sanitized;
};

module.exports = { sanitizeObject };
