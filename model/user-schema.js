const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // install "bcrypt" since it performs faster on server than "bcryptjs"
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please Enter a username"],
      minlength: [3, "Username length cannot be less than 3 characters."],
      maxlength: [40, "Username length cannot be more than 40 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: [true, "Email already exist"],
      maxlength: [50, "Email length cannot be more than 50 characters."],
      match: [
        /^\w+([\.-_]?\w+)*@\w+([\.-_]?\w+)*(\.\w{2,3})+$/,
        "Email is not in the right format. Enter a valid email.",
      ],
    },
    password: {
      type: String,
      required: [true, "Password must be provided."],
      minlength: [6, "Password length cannot be less than 8 characters."],
    },
    cartData: {
      type: Object,
    },
    refreshToken: {
      token: String,
      deviceId: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: Date,
    },
  },
  { timestamps: true }
); // The 'timestamps' property automatically generate "createdAt" and "updatedAt" fields in the
// schema records

// The regex above matches the string from the beginning to the end as indicated by the "^$" symbol.
// The part \w+([\.-_]?\w+)* which was repeated twice each means one or more of word characters "\w+",
// followed by any of ".-_" i.e. [\.-_] with zero or one occurrence "?" and one or more of word
// characters "\w+" both of which have zero or more occurence "*" as seen in the ([\.-_]?\w+)* symbol.
//   \w+([\.-_]?\w+)*@\w+([\.-_]?\w+)* generally matches beauty@gmail, beauty.angel@hot_mail,
// beauty-angel@y-mail, beauty_angel@yahoo.co
//   The part (\.\w{2,3})+ means dot "." which was excaped with "\." followed by word character that
// is exactly 2 or 3 characters i.e. "\w{2,3}" both of which have one or more occurence "+"
//   (\.\w{2,3})+ generally matches .ng, .uk, .com, .org, .net, .edu, .co.uk, .gov
// Combining the two parts together gives beauty@gmail.com, beauty_angel@yahoo.co.uk, etc.

// Schema middleware to hash the "password" field in the data that will be processed by the schema.
// It is applied when the .save() and .create() method of the database query are used
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      // isModified() checks if the "password" field has changed to a new one before running the
      // code in the "if" block. This ensures that the "password" field is hashed only once.
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      console.error("Error hashing password.");
    }
  }
  next(); // If password has not changed next() to proceed to other segment of the application
});

// Schema instance method to compare password for authentication
userSchema.methods.comparePassword = async function (requestBodyPassword) {
  try {
    const isMatch = await bcrypt.compare(requestBodyPassword, this.password);
    return isMatch;
  } catch (error) {
    console.error("Error comparing password.");
  }
};

// To generate strings for JWT Token Secret for usage in the ".env" file. Type "node" in the
// terminal, press enter key and then type the following code:
//    require('crypto').randomBytes(64).toString('hex')

// Schema instance method to create JWT using "_id" and "username" field in the schema data and type.
userSchema.methods.createJWT = function (deviceIdentifier) {
  try {
    // jwt.sign() is synchronous, so it does not need to be wrapped in a try/catch block.
    const accessToken = jwt.sign(
      { userId: this._id, name: this.username, type: "access" },
      process.env.ACCESS_JWT_SECRET,
      { expiresIn: process.env.ACCESS_JWT_LIFETIME }
    );
    // Add the device identity to track the device where the refresh token will be reused from.
    const refreshToken = jwt.sign(
      {
        userId: this._id,
        name: this.username,
        deviceIdentity: deviceIdentifier,
        type: "refresh",
      },
      process.env.REFRESH_JWT_SECRET,
      { expiresIn: process.env.REFRESH_JWT_LIFETIME }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Error generating tokens...");
  }
};

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
