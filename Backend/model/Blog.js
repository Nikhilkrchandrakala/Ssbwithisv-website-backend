const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      required: true,
    },

    content: {
      type: String, // CKEditor HTML
      required: true,
    },

    images: {
      type: [String], // array of image paths
      default: [],
    },

    // ✅ NEW FIELD: time duration (example: "5 min read")
    timeDuration: {
      type: String,
      required: false,
      default: "",
    },

    // ✅ NEW FIELD: text on the image (overlay text / caption)
    imageText: {
      type: String,
      required: false,
      default: "",
    },

    authorName: {
      type: String,
      required: true,
    },

    authorQuote: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserDetails",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
