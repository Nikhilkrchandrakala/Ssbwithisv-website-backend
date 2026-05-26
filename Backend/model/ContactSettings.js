const mongoose = require("mongoose");

const contactSettingsSchema = new mongoose.Schema({
  whatsappNumber: {
    type: String,
    required: true,
    default: "8420422821"
  },
  callNumber: {
    type: String,
    required: true,
    default: "7483617249"
  }
}, { timestamps: true });

const ContactSettings = mongoose.model("ContactSettings", contactSettingsSchema);

module.exports = {
  ContactSettings,
};
