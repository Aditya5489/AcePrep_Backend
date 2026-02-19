const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and JPG are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  fileSize: 5 * 1024 * 1024 
});

module.exports = upload;
