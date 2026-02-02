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
      type: String,
      required: true,
    },

    // ✅ Each image has its own text
    images: [
      {
        imageUrl: {
          type: String,
          required: true,
        },
        imageText: {
          type: String,
          default: "",
        },
      },
    ],

    timeDuration: {
      type: String,
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
