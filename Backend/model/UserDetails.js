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
    required: false,   // Optional for OAuth users (Google/Facebook/LinkedIn)
    unique: true,
    sparse: true,      // Allows multiple documents with phone: null
  },

  password: {
    type: String,
    required: false,   // Optional for OAuth users (they have no password)
  },

  // ─── Social / OAuth Login Fields ───
  oauthProvider: {
    type: String,
    enum: ["google", "facebook", "linkedin", null],
    default: null,
  },
  oauthId: {
    type: String,
    default: null,
  },

  // ─── Zoho Form Gate ───
  zohoFormFilled: {
    type: Boolean,
    default: false,   // Must be true before user can download magazines
  },

  Address: {
    type: String,
  },
  profileImage: {   // 👈 ADD THIS
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: true,
  },
  phoneVerified: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    default: "lead",
  },
  assessorType: {
    type: String,
    enum: ["GTO", "TO", "Psych", "IO", null],
    default: null
  },
  clinicalStage: {
    type: String,
    default: null
  },
  batch: {
    type: String,
    default: ""
  },
  chestNo: {
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
  },
  assignedAssessments: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assessment" }],
    default: []
  },
  hasPsychTheoryConsent: {
    type: Boolean,
    default: false
  },
  psychTestAttemptedAt: {
    type: Date,
    default: null
  },
  downloadedMagazines: {
    type: [
      {
        magazineId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MagazinePdf',
          required: true
        },
        downloadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  
  // ─── Extended SSB Profile fields ───
  dob: { type: String, default: "" },
  ssbAspirant: { type: String, default: "" },
  servingCandidate: { type: String, default: "" },
  vtxHeard: { type: String, default: "" },
  youtubeSubscribed: { type: String, default: "" },
  podcastSubscribed: { type: String, default: "" },
  ssbExperience: { type: String, default: "" },
  nextSsbDate: { type: String, default: "" },
  ssbBoards: { type: [String], default: [] },
  ssbEntries: { type: [String], default: [] },
  city: { type: String, default: "" },
  state: { type: String, default: "" }
}, { timestamps: true });

/* 🔐 Password hash — only runs if password is set (OAuth users have no password) */
userSchema.pre("save", async function (next) {
  if (!this.password) return next();          // Skip hashing if no password (OAuth user)
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const UserDetails = mongoose.model("User", userSchema);

module.exports = { UserDetails };
