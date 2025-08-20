require("dotenv").config(); // OR   require('dotenv/config')

// To generate strings for JWT Token Secret for usage in the ".env" file. Type "node" in the
// terminal, press enter key and then type the following code:
//    require('crypto').randomBytes(64).toString('hex')

// SECURITY PACKAGES
const helmet = require("helmet");
const rateLimit = require("express-rate-limit"); // connection frequency management
const xss = require("xss-clean"); // prevent cross server scripting
const cookieParser = require("cookie-parser"); // for handling cookies
const cors = require("cors"); // enables cross origin resource sharing
const expressMongoSanitize = require("express-mongo-sanitize"); // for MongoDB injection prevention

const mongoose = require("mongoose"); // database driver
const express = require("express"); // server
const app = express();

const authUserRoute = require("./routes/user-reglogin-route");
const productImageToDBRoute = require("./routes/product-image-route");
const adminRoute = require("./routes/admin-reglogin-route");
const requestSanitizer = require("./middleware/input-sanitizer-midware"); // sanitizes "req" object from client

// ENVIROMENT VARIABLES
const port = process.env.PORT || 4000;
const myAllowedOrigins = [
  "https://myshopper.onrender.com",
  "https://admin-myshopper.onrender.com",
]; // || process.env.ALLOWED_ORIGINS.split(",");

// MIDDLEWARES
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
); // app.use(helmet());   // or simply use this

app.use(xss());
app.use(expressMongoSanitize());
app.use(cookieParser());

app.use(
  cors({
    origin: myAllowedOrigins,
    credentials: true, // this allows cookies to be sent.
    // // The following properties are optional.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // the methods allowed.
    // By default, the allowed "methods" are ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Token-Refresh-Required", // set-up in "check-access-jwt-refresh.js" file
      "Accept",
      "Origin",
    ], // Default "allowedHeaders" are ["Content-Type", "Authorization"]
    exposedHeaders: ["Set-Cookie"], // allows client (i.e. browser) to read 'Set-Cookie' header.
    optionsSuccessStatus: 200, // Default is 204, which is not supported by older browsers.
    preflightContinue: false, // Default is "false".
  })
);

// The general rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in window milliseconds
    max: 50, // limit each IP to 50 requests per windowMs
    message: "Too many requests attempts, please try again later",
  })
);

app.use(requestSanitizer); // sanitizes user's input

// middleware to handle json data i.e. 'Content-Type': 'application/json
app.use(express.json({ limit: "50mb" })); // OR app.use(bodyParser.json());
// middleware to handle urlencoded data i.e. 'Content-Type': 'application/x-www-form-urlencoded'
// and 'Content-Type': 'multipart/form-data'
app.use(express.urlencoded({ limit: "50mb", extended: true })); // OR app.use(bodyParser.urlencoded({ extended: true }));

// for serving static files (e.g. css, images, texts) on the specified route "/api/auth/server/uploaded"
app.use("/api/auth/server/uploaded", express.static("./server-uploads")); // route and folder name

app.use("/api/auth", authUserRoute); // the route becomes http://localhost:4000/api/auth
app.use("/api/product", productImageToDBRoute); // the route becomes http://localhost:4000/api/product
app.use("/api/admin", adminRoute); // the route becomes http://localhost:4000/api/admin

// listens for the database connection before starting the server.
mongoose.connection.once("open", () => {
  app.listen(port, () => console.log(`Server listening at port ${port}.`));
});
