// routes/orderRoutes.js - UPDATED VERSION

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../model/Order");
const Coupon = require("../model/Coupon");
const Slot = require("../model/Slot");
const checkAuth = require("../middlewares/CheckAuth");
const Course = require("../model/Course");

// Helper function to calculate GST (18%)
const calculateGST = (amount) => {
    return amount * 0.18;
};

// ✅ CREATE ORDER (UPDATED)
// routes/orderRoutes.js

router.post("/createOrder", checkAuth, async (req, res) => {
    try {
        const {
            slotId,          // 🔥 CHANGE
            amount,
            referralCode,
            couponCode,
            selectedModules
        } = req.body;

        const userId = req.user.id;

        // ✅ check slot exists
        const slot = await Slot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: "Slot not found" });
        }

        // ✅ check if booking is closed (cutoff is 11:59:59 PM the day before)
        if (slot.startTime) {
            const startDate = new Date(slot.startTime);
            const cutoffDate = new Date(startDate);
            cutoffDate.setDate(cutoffDate.getDate() - 1);
            cutoffDate.setHours(23, 59, 59, 999);
            
            if (new Date() > cutoffDate) {
                return res.status(400).json({ message: "Booking for this batch is closed." });
            }
        }

        // ✅ Dynamic Global Pricing Verification
        const courses = await Course.find({
            courseId: { $in: ['ssb_ppdt', 'psych', 'interview', 'group_testing', 'full_course'] }
        });

        const courseMap = {};
        courses.forEach(c => {
            courseMap[c.courseId] = c.price;
        });

        // Robust offline-safe baseline defaults
        const defaults = {
            ssb_ppdt: 1999,
            psych: 3499,
            interview: 2499,
            group_testing: 7999,
            full_course: 12499
        };

        const getPrice = (id) => courseMap[id] !== undefined ? courseMap[id] : defaults[id];

        let calculatedBaseAmount = 0;
        const modules = selectedModules || [];

        if (slot.isFullCourse) {
            // Full Course slots dynamically bind to the global Full Bundle Course price
            calculatedBaseAmount = getPrice('full_course');
        } else {
            if (modules.length === 0) {
                calculatedBaseAmount = slot.price || getPrice('full_course');
            } else if (modules.includes('full_course')) {
                calculatedBaseAmount = getPrice('full_course');
            } else {
                // If all 4 individual modules are selected, apply full course price
                const individualSelectedCount = modules.filter(id => id !== 'full_course').length;
                if (individualSelectedCount === 4) {
                    calculatedBaseAmount = getPrice('full_course');
                } else {
                    let sum = 0;
                    modules.forEach(id => {
                        if (id !== 'full_course') {
                            sum += getPrice(id);
                        }
                    });
                    calculatedBaseAmount = sum;
                }
            }
        }

        // ✅ GST and Discount Logic
        const baseAmount = calculatedBaseAmount;
        let discount = 0;

        // ✅ COUPON APPLY
        if (couponCode) {
            const coupon = await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true,
            });

            if (!coupon) {
                return res.status(400).json({ message: "Invalid coupon" });
            }

            if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
                return res.status(400).json({ message: "Coupon expired" });
            }

            const alreadyUsed = (coupon.usedBy || []).some(
                (u) => u.userId.toString() === userId
            );

            if (alreadyUsed) {
                return res.status(400).json({
                    message: "Coupon already used",
                });
            }

            if (coupon.discountType === "percent") {
                discount = (baseAmount * coupon.discountValue) / 100;
            } else {
                discount = Math.min(coupon.discountValue, baseAmount);
            }
        }

        const netAmount = Math.max(baseAmount - discount, 0);
        const gstAmount = netAmount * 0.18;
        const finalAmount = netAmount + gstAmount;
        const originalAmountWithGST = baseAmount + (baseAmount * 0.18);

        const amountInPaise = Math.round(finalAmount * 100);

        // 🔥 CREATE ORDER FIRST (IMPORTANT FOR REFERENCE)
        const order = new Order({
            userId,
            slotId,                 // 🔥 CHANGE
            price: finalAmount,
            originalAmount: originalAmountWithGST,
            discount,
            couponCode: couponCode || null,
            referralCode: referralCode || null,
            selectedModules: selectedModules || [],
            status: "pending",
        });

        await order.save();

        // 🔥 RAZORPAY ORDER (WITH REFERENCE)
        const options = {
            amount: amountInPaise,
            currency: "INR",

            // 🔥 BEST receipt
            receipt: "slot_" + order._id,

            // 🔥 tracking
            notes: {
                orderId: order._id.toString(),
                userId: userId.toString(),
                slotId: slotId.toString(),
            }
        };

        const razorOrder = await razorpay.orders.create(options);

        order.orderId = razorOrder.id;
        await order.save();

        res.json({
            orderId: razorOrder.id,
            amount: razorOrder.amount,
        });

    } catch (err) {
        console.error(err);
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

        // console.log(expected)

        if (expected !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const order = await Order.findOne({ orderId: razorpay_order_id });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // ✅ mark paid
        order.status = "paid";
        order.paymentId = razorpay_payment_id;
        await order.save();

        // 🔥 ADD USER TO SLOT
        const slot = await Slot.findById(order.slotId);

        if (!slot.bookedStudents.includes(order.userId)) {
            slot.bookedStudents.push(order.userId);
            await slot.save();
        }

        // Synchronize student's profile batch, role, and clinicalStage in UserDetails
        const { UserDetails } = require("../model/UserDetails");
        const updateFields = {
            role: "student"
        };
        if (slot && slot.batchNo) {
            updateFields.batch = slot.batchNo.trim();
        }
        const bookedModules = order.selectedModules || [];
        if (bookedModules.length === 1 && bookedModules[0] !== 'full_course') {
            updateFields.clinicalStage = bookedModules[0];
        } else if (bookedModules.includes('full_course') || bookedModules.length > 1 || bookedModules.length === 0) {
            updateFields.clinicalStage = 'full_course';
        }
        await UserDetails.findByIdAndUpdate(order.userId, updateFields);

        // 🔥 mark coupon used
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

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ... rest of your routes (myOrders, allOrders) remain the same

// ✅ USER ORDER HISTORY
router.get("/myOrders", checkAuth, async (req, res) => {

    const orders = await Order.find({
        userId: req.user.id,
        status: "paid"
    })
        .populate("courseId")
        .sort({ createdAt: -1 });

    res.json(orders);
});


// ✅ ADMIN ORDER HISTORY
router.get("/allOrders", checkAuth, async (req, res) => {
    try {

        const orders = await Order.find({ status: "paid" })
            .populate("userId", "name email")
            .populate(
                "slotId",
                "title batchNo price startTime endTime maxStudents"
            )
            .sort({ createdAt: -1 });

        res.json({
            total: orders.length,
            orders,
        });

    } catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
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