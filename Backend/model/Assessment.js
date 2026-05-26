const mongoose = require("mongoose");

const AssessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['TAT', 'WAT', 'SRT', 'SDT', 'GENERAL'],
    default: 'GENERAL',
  },
  instructions: String,
  duration: Number,
  active: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { collection: "assessments", timestamps: true });

const Assessment = mongoose.model("Assessment", AssessmentSchema);

module.exports = Assessment;
