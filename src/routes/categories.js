const express = require("express");
const { Category } = require("../models/Category");
const { requireRole } = require("../middleware/auth");
const { logoUpload } = require("../middleware/upload");
const { uploadToR2, isR2Configured } = require("../utils/r2");

const router = express.Router();

// ── GET active categories (Public/Creator/Mobile) ───────────────────
router.get("/", async (req, res) => {
  try {
    const { section } = req.query;
    const filter = { isActive: true };
    if (section) {
      filter.section = section;
    }
    const categories = await Category.find(filter).sort({ name: 1 });
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

// ── GET all categories (Admin/APP/CEO/Superadmin) ──────────────────
router.get("/all", requireRole("ADMIN", "SUPERADMIN", "APP", "CEO"), async (req, res) => {
  try {
    const { section } = req.query;
    const filter = {};
    if (section) {
      filter.section = section;
    }
    const categories = await Category.find(filter).sort({ createdAt: -1 });
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

// ── POST create category (Admin/APP/CEO/Superadmin) ─────────────────
router.post("/", requireRole("ADMIN", "SUPERADMIN", "APP", "CEO"), logoUpload.single("image"), async (req, res) => {
  try {
    const { name, section, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "NAME_REQUIRED" });
    }

    const nameTrim = name.trim();
    const sectionName = section ? section.trim() : "ugc_prompter";

    // Check duplicate
    const exists = await Category.findOne({ name: nameTrim, section: sectionName });
    if (exists) {
      return res.status(400).json({ error: "DUPLICATE_CATEGORY", message: "Category name already exists in this section" });
    }

    let imageUrl = null;
    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "categories/images");
      imageUrl = uploaded.url;
    }

    const isActiveVal = isActive === undefined ? true : (isActive === "true" || isActive === true || isActive === 1 || isActive === "1");

    const cat = new Category({
      name: nameTrim,
      section: sectionName,
      isActive: isActiveVal,
      imageUrl
    });
    await cat.save();

    return res.status(201).json(cat);
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

// ── PUT update category (Admin/APP/CEO/Superadmin) ──────────────────
router.put("/:id", requireRole("ADMIN", "SUPERADMIN", "APP", "CEO"), logoUpload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section, isActive } = req.body;

    const cat = await Category.findById(id);
    if (!cat) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    if (name !== undefined) {
      const nameTrim = name.trim();
      if (!nameTrim) {
        return res.status(400).json({ error: "NAME_REQUIRED" });
      }

      // Check duplicates if name is changing
      const targetSection = section !== undefined ? section.trim() : cat.section;
      if (nameTrim !== cat.name || targetSection !== cat.section) {
        const exists = await Category.findOne({ name: nameTrim, section: targetSection });
        if (exists) {
          return res.status(400).json({ error: "DUPLICATE_CATEGORY", message: "Category name already exists in this section" });
        }
      }
      cat.name = nameTrim;
    }

    if (section !== undefined) {
      cat.section = section.trim();
    }

    if (isActive !== undefined) {
      cat.isActive = (isActive === "true" || isActive === true || isActive === 1 || isActive === "1");
    }

    if (req.file) {
      if (!isR2Configured()) return res.status(503).json({ error: "R2_NOT_CONFIGURED" });
      const uploaded = await uploadToR2(req.file, "categories/images");
      cat.imageUrl = uploaded.url;
    }

    await cat.save();
    return res.json(cat);
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

// ── DELETE delete category (Admin/APP/CEO/Superadmin) ───────────────
router.delete("/:id", requireRole("ADMIN", "SUPERADMIN", "APP", "CEO"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: err.message });
  }
});

module.exports = { categoriesRouter: router };
