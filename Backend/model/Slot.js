// models/Slot.js
const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        batchNo: {
            type: String, // e.g. "2026-01" or "45"
        },

        startTime: {
            type: String,
            required: true,
        },

        endTime: {
            type: String,
            required: true,
        },

        maxStudents: {
            type: Number,
            default: 50,
        },

        bookedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        price: {   // 🔥 IMPORTANT (payment ke liye)
            type: Number,
            required: true,
        },

        isFullCourse: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);