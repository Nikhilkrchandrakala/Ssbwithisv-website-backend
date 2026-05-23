// model/Course.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    price: Number,

    thumbnail: {
      type: String, // single image
    },

    courseId: {
      type: String,
      unique: true,
      sparse: true,
    },

    images: [
      {
        imageUrl: String,
      },
    ],

    duration: String,
    category: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SSBCourses", courseSchema);