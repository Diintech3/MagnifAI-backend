const multer = require("multer");

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("INVALID_FILE_TYPE"));
    }
    return cb(null, true);
  },
});

const candidateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("INVALID_FILE_TYPE"));
    }
    return cb(null, true);
  },
}).fields([
  { name: "partyLogo", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

module.exports = { logoUpload, candidateUpload };
