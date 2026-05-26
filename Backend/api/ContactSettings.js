const express = require("express");
const router = express.Router();
const { ContactSettings } = require("../model/ContactSettings");
const checkAuth = require("../middlewares/CheckAuth");

// Get contact settings (or create default if missing)
router.get("/contactSettings", async (req, res) => {
  try {
    let settings = await ContactSettings.findOne();
    if (!settings) {
      settings = new ContactSettings();
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update contact settings (requires authentication)
router.put("/contactSettings", checkAuth, async (req, res) => {
  try {
    const { whatsappNumber, callNumber } = req.body;
    let settings = await ContactSettings.findOne();
    if (!settings) {
      settings = new ContactSettings();
    }
    if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber.trim().replace(/\s+/g, "");
    if (callNumber !== undefined) settings.callNumber = callNumber.trim().replace(/\s+/g, "");
    
    await settings.save();
    res.status(200).json({ message: "Successfully updated contact settings", data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
