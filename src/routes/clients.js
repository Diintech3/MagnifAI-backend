const express = require("express");
const { logoUpload } = require("../middleware/upload");
const { uploadToR2, isR2Configured } = require("../utils/r2");

const router = express.Router();

router.post("/upload-image", logoUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "FILE_REQUIRED" });
    }
    if (!isR2Configured()) {
      return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
    }
    const uploaded = await uploadToR2(req.file, "clients/images");
    return res.json({
      success: true,
      url: uploaded.url
    });
  } catch (err) {
    return res.status(500).json({ error: "UPLOAD_IMAGE_ERROR", message: err.message });
  }
});

module.exports = { clientsRouter: router };
