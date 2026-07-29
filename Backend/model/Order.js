// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Optional during unauthenticated guest course checkout
        },

        // 🔥 Guest Checkout Data
        guestData: {
            name: { type: String },
            email: { type: String },
            phone: { type: String },
            generatedPassword: { type: String },
        },

        slotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Slot",
            required: true,
        },

        // 🔥 Pricing
        price: {
            type: Number, // final price after GST + discount
            required: true,
        },

        originalAmount: {
            type: Number, // price + GST before discount
        },

        discount: {
            type: Number,
            default: 0,
        },

        // 🔥 Coupon & Referral
        couponCode: {
            type: String,
            default: null,
        },

        referralCode: {
            type: String,
            default: null,
        },

        // 🔥 Razorpay
        orderId: {
            type: String, // Razorpay order id
        },

        paymentId: {
            type: String,
        },

        signature: {
            type: String,
        },

        // 🔥 Status
        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },

        selectedModules: {
            type: [String],
            default: [],
        },

        // 🔥 Booking Channel — how this order was created
        bookingMethod: {
            type: String,
            enum: ['manual', 'standard', 'franchise'],
            default: null, // null = legacy order (treated as 'standard' in UI)
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);