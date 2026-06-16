const mongoose = require("mongoose");

const magazinePdfSchema = new mongoose.Schema({
  pdfTitle: {
    type: String,
    required: true,
  },
  pdfFilePath: {
    type: String,
    required: true,
  },
  magazineFrontImage: {
    type: String, // File path for the front image
    required: true, // Set to true if it's required, otherwise false
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  tags: {
    type: String,
    required: true,
  },
});

const MagazinePdf = mongoose.model("MagazinePdf", magazinePdfSchema);

module.exports = {
  MagazinePdf,
};
