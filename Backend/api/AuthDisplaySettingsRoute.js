const express = require("express");
const router = express.Router();
const { AuthDisplaySettings } = require("../model/AuthDisplaySettings");
const checkAuth = require("../middlewares/CheckAuth");
const galleryUpload = require("../middlewares/galleryUpload");
const fs = require("fs");
const path = require("path");

// GET current settings
router.get("/authDisplaySettings", async (req, res) => {
  try {
    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings({
        mode: "slideshow",
        slideshowImages: [],
        adImage: "",
        adLink: "",
        transitionValue: 5,
        transitionUnit: "seconds"
      });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update basic settings (mode, adLink, transitionValue, transitionUnit)
router.put("/authDisplaySettings", checkAuth, async (req, res) => {
  try {
    const { mode, adLink, transitionValue, transitionUnit } = req.body;
    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings();
    }
    if (mode !== undefined) {
      if (["slideshow", "ad"].includes(mode)) {
        settings.mode = mode;
      } else {
        return res.status(400).json({ message: "Invalid mode selection" });
      }
    }
    if (adLink !== undefined) {
      settings.adLink = adLink;
    }
    if (transitionValue !== undefined) {
      settings.transitionValue = Number(transitionValue);
    }
    if (transitionUnit !== undefined) {
      if (["seconds", "minutes", "hours", "days"].includes(transitionUnit)) {
        settings.transitionUnit = transitionUnit;
      } else {
        return res.status(400).json({ message: "Invalid transition unit selection" });
      }
    }
    await settings.save();
    res.status(200).json({ message: "Settings updated successfully", data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST upload slideshow images (max 10 total)
router.post("/authDisplaySettings/uploadSlideshow", checkAuth, galleryUpload.array("images", 10), async (req, res) => {
  try {
    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings();
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const BASE_URL = `${req.protocol}://${req.get("host")}`;
    const newImages = req.files.map(file => `${BASE_URL}/uploads/gallery/images/${file.filename}`);

    // Ensure we don't exceed 10 images total
    if (settings.slideshowImages.length + newImages.length > 10) {
      return res.status(400).json({ message: "Maximum 10 slideshow images allowed" });
    }

    settings.slideshowImages = [...settings.slideshowImages, ...newImages];
    await settings.save();

    res.status(200).json({ message: "Slideshow images uploaded successfully", data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST upload single Ad image
router.post("/authDisplaySettings/uploadAd", checkAuth, galleryUpload.single("image"), async (req, res) => {
  try {
    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      settings = new AuthDisplaySettings();
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const BASE_URL = `${req.protocol}://${req.get("host")}`;
    settings.adImage = `${BASE_URL}/uploads/gallery/images/${req.file.filename}`;
    await settings.save();

    res.status(200).json({ message: "Ad image uploaded successfully", data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a slideshow image
router.put("/authDisplaySettings/deleteSlideshowImage", checkAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    let settings = await AuthDisplaySettings.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    settings.slideshowImages = settings.slideshowImages.filter(img => img !== imageUrl);
    await settings.save();

    // Optionally try to delete the file on disk if it is local
    try {
      const parts = imageUrl.split("/uploads/gallery/images/");
      if (parts.length > 1) {
        const filename = parts[1];
        const filePath = path.join(__dirname, "../uploads/gallery/images", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      console.error("Error deleting file on disk:", e);
    }

    res.status(200).json({ message: "Slideshow image deleted successfully", data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
