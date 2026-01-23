const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    entry: {
      type: String,
      required: true,
    },
    board: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "",
    },
    img: {
      type: String, // image URL or local path
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);
