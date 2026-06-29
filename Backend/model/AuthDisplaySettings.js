const mongoose = require("mongoose");

const authDisplaySettingsSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ["slideshow", "ad"],
    default: "slideshow"
  },
  slideshowImages: {
    type: [String], // Array of image URLs (up to 10)
    default: []
  },
  adImage: {
    type: String, // Single image URL
    default: ""
  },
  adLink: {
    type: String, // Destination URL
    default: ""
  },
  transitionValue: {
    type: Number,
    default: 5
  },
  transitionUnit: {
    type: String,
    enum: ["seconds", "minutes", "hours", "days"],
    default: "seconds"
  }
}, { timestamps: true });

const AuthDisplaySettings = mongoose.model("AuthDisplaySettings", authDisplaySettingsSchema);

module.exports = {
  AuthDisplaySettings,
};
