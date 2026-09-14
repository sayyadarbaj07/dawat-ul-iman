const multer = require("multer");
const { ALLOWED_MIME_TYPES } = require("../utils/fileValidator");

const storage = multer.memoryStorage();

const documentUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (Object.keys(ALLOWED_MIME_TYPES).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, JPEG, PNG, and WEBP are allowed."), false);
    }
  },
});

module.exports = documentUpload;
