// routes/orderRoutes.js - UPDATED VERSION

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../model/Order");
const Coupon = require("../model/Coupon");
const checkAuth = require("../middlewares/CheckAuth");

// Helper function to calculate GST (18%)
const calculateGST = (amount) => {
    return amount * 0.18;
};

// ✅ CREATE ORDER (UPDATED)
router.post("/createOrder", checkAuth, async (req, res) => {
    try {
        const {
            courseId,
            amount,        // This should be the base course price
            courseTitle,
            referralCode,
            couponCode
        } = req.body;

        const userId = req.user.id;

        // Calculate GST on the base amount
        const baseAmount = Number(amount);
        const gstAmount = calculateGST(baseAmount);
        let originalAmountWithGST = baseAmount + gstAmount;
        let finalAmount = originalAmountWithGST;
        let discount = 0;

        console.log("Order creation request:", {
            baseAmount,
            gstAmount,
            originalAmountWithGST,
            couponCode
        });

        // ✅ If coupon applied → revalidate and apply discount on amount WITH GST
        if (couponCode) {
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
            });

            if (!coupon) {
                return res.status(400).json({ message: "Invalid coupon" });
            }

            // Check expiry
            if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
                return res.status(400).json({ message: "Coupon has expired" });
            }

            // Check if already used by this user
            const alreadyUsed = (coupon.usedBy || []).some(
                (u) => u.userId.toString() === userId
            );

            if (alreadyUsed) {
                return res.status(400).json({
                    message: "You have already used this coupon",
                });
            }

            // Calculate discount on the amount WITH GST
            if (coupon.discountType === "percent") {
                discount = (originalAmountWithGST * coupon.discountValue) / 100;
            } else {
                // flat discount
                discount = Math.min(coupon.discountValue, originalAmountWithGST);
            }

            finalAmount = Math.max(originalAmountWithGST - discount, 0);

            console.log("Coupon applied:", {
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountCalculated: discount,
                finalAmount
            });
        }

        // Ensure finalAmount is in paise for Razorpay (multiply by 100)
        const amountInPaise = Math.round(finalAmount * 100);

        if (amountInPaise <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        // ✅ Razorpay order
        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "order_" + Date.now(),
        };

        const razorOrder = await razorpay.orders.create(options);

        // ✅ Save order
        const order = new Order({
            userId,
            courseId,
            courseTitle,
            price: finalAmount,  // Final amount after discount (including GST)
            originalAmount: originalAmountWithGST,  // Original amount with GST
            discount: discount,
            couponCode: couponCode || null,
            referralCode: referralCode || null,
            orderId: razorOrder.id,
            status: "pending",
        });

        await order.save();

        res.json({
            orderId: razorOrder.id,
            amount: razorOrder.amount,  // Amount in paise
        });

    } catch (err) {
        console.error("Create order error:", err);
        res.status(500).json({ message: err.message });
    }
});

// ✅ VERIFY PAYMENT (unchanged, but ensure coupon marking works)
router.post("/verifyPayment", checkAuth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expected === razorpay_signature) {

            const order = await Order.findOne({ orderId: razorpay_order_id });

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            order.paymentId = razorpay_payment_id;
            order.signature = razorpay_signature;
            order.status = "paid";

            await order.save();

            // 🔥 MARK COUPON USED (if coupon was applied)
            if (order.couponCode) {
                await Coupon.updateOne(
                    { code: order.couponCode },
                    {
                        $push: {
                            usedBy: {
                                userId: order.userId,
                                usedAt: new Date(),
                            },
                        },
                    }
                );
            }

            res.json({ success: true });

        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }

    } catch (err) {
        console.error("Verify payment error:", err);
        res.status(500).json({ message: err.message });
    }
});

// ... rest of your routes (myOrders, allOrders) remain the same

// ✅ USER ORDER HISTORY
router.get("/myOrders", checkAuth, async (req, res) => {
    const orders = await Order.find({ userId: req.user.id })
        .populate("courseId")
        .sort({ createdAt: -1 });

    res.json(orders);
});


// ✅ ADMIN ORDER HISTORY
router.get("/allOrders", checkAuth, async (req, res) => {
    const orders = await Order.find()
        .populate("userId", "name email")
        .populate("courseId")
        .sort({ createdAt: -1 });

    res.json(orders);
});

router.get("/checkPurchase/:courseId", checkAuth, async (req, res) => {
    try {
        const exists = await Order.findOne({
            userId: req.user.id,
            courseId: req.params.courseId,
            status: "paid"
        });

        res.json({
            purchased: !!exists
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;