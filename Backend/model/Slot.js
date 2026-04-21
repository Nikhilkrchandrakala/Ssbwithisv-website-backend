// models/Slot.js
const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
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

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);