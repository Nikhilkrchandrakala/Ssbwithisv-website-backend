const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SSBCourses",
        },

        courseTitle: String,

        // 🔥 pricing
        price: Number,              // final amount (after discount)
        originalAmount: Number,     // actual price before discount
        discount: Number,           // discount applied

        // 🔥 coupon + referral
        couponCode: String,
        referralCode: String,

        // 🔥 payment
        paymentId: String,
        orderId: String,
        signature: String,

        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);