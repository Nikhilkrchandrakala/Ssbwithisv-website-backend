// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        required: true,
    },

    discountType: {
        type: String,
        enum: ["percent", "flat"],
        required: true,
    },

    discountValue: {
        type: Number,
        required: true,
    },

    franchiseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Franchise",
        required: true,
    },

    expiry: Date,

    isActive: {
        type: Boolean,
        default: true,
    },

    usedBy: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            usedAt: Date,
        },
    ],

}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);