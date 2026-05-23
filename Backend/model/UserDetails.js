const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },
  Address: {
    type: String,
  },
  profileImage: {   // 👈 ADD THIS
    type: String,
  },
  role: {
    type: String,
    default: "student",
  },
  assessorType: {
    type: String,
    enum: ["GTO", "TO", "Psych", "IO", null],
    default: null
  },
  clinicalStage: {
    type: String,
    enum: ["Screening", "Psychology", "GTO", "Interview", "Conference", "Completed"],
    default: "Screening"
  },
  batch: {
    type: String,
    default: ""
  },
  isManuallyCreated: {
    type: Boolean,
    default: false
  },
  assignedGTO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  assignedTO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  assignedPsych: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  assignedIO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { timestamps: true });

/* 🔐 Password hash */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const UserDetails = mongoose.model("User", userSchema);

module.exports = { UserDetails };
