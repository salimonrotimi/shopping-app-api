// Multer configuration. It is only needed at the routes to enable upload
const multer = require("multer");
const path = require("path");

// UPLOAD TO DATABASE
// Use "memory storage" to save image into the database memory. It is not the best approach.
// The best approach is to save image in a folder on server and save the path to the databse memory
const fileStorageToDB = multer.memoryStorage();

const uploadFileToDBMulter = multer({
  storage: fileStorageToDB,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // "req" is not used used because the file is yet to be pushed into the server
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // "cb" is a callback function made up of the "error" value (null or new Error)
      // and the "success" value (true or false or operation to be performed if successful)
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

// UPLOAD TO SERVER ENVIRONMENT
// Best approach for saving pictures and files when the path is saved in the database for backup.
// But the files disappear whenever the server (e.g. Render server) is restarted
// Use "disk storage" if the image is to be saved into a folder e.g. "./server-uploads" in the server environment
const fileStorageToServer = multer.diskStorage({
  destination: "./server-uploads", // "./server-uploads" is the image storage folder name
  // OR use
  // destination: function(req, file, cb) {
  //    cb(null, "./server-uploads");
  //                          // "null" is the error value, "./server-uploads" is the success value
  // },
  filename: function (req, file, cb) {
    cb(null, new Date().getTime() + path.extname(file.originalname)); // rename the image
  },
});

// upload the image after specifying the storage
const uploadFileToServerMulter = multer({
  storage: fileStorageToServer,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/gif"
    ) {
      cb(null, true); // "null" is the error value, "true" is the success value
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

module.exports = { uploadFileToDBMulter, uploadFileToServerMulter };
