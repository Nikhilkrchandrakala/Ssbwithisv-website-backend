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
      maxlength: 200,
    },

    content: {
      type: String, // CKEditor HTML
      required: true,
    },

    images: {
      type: [String], // array of image paths
      default: [],
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
