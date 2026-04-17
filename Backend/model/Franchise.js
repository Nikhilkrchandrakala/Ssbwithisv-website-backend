// models/Franchise.js
const mongoose = require("mongoose");

const franchiseSchema = new mongoose.Schema(
    {
        name: String,
        email: {
            type: String,
            unique: true
        },
        phone: String,

        referralCode: {
            type: String,
            unique: true,
        },

        commissionPercent: {
            type: Number,
            default: 20, // 20%
        },

        totalEarning: {
            type: Number,
            default: 0,
        },
        // models/Franchise.js

        password: String,

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Franchise", franchiseSchema);