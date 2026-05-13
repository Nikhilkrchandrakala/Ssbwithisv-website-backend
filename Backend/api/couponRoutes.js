const express = require("express");
const router = express.Router();

const Coupon = require("../model/Coupon");
const Franchise = require("../model/Franchise");
const CheckAuth = require("../middlewares/CheckAuth");


// ========================================
// ✅ CREATE COUPON (Franchise Manual)
// ========================================
router.post("/createCoupon", CheckAuth, async (req, res) => {
    try {
        const { code, discountType, discountValue, expiry } = req.body;

        if (!code || !discountType || !discountValue) {
            return res.status(400).json({ message: "All fields required" });
        }

        // ❌ duplicate check
        const exists = await Coupon.findOne({ code: code.toUpperCase() });
        if (exists) {
            return res.status(400).json({ message: "Coupon already exists" });
        }

        // ✅ franchise verify
        // const franchise = await Franchise.findById(req.user.id);
        // if (!franchise) {
        //     return res.status(404).json({ message: "Franchise not found" });
        // }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            expiry,
            // franchiseId: franchise._id,
        });

        await coupon.save();

        res.json({
            message: "Coupon created successfully",
            coupon,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ✅ GET ALL COUPONS (Franchise)
// ========================================
// router.get("/myCoupons", CheckAuth, async (req, res) => {
//     try {
//         const coupons = await .find({
//             franchiseId: req.user.id,
//         }).sort({ createdAt: -1 });

//         res.json(coupons);

//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

router.get("/myCoupons", CheckAuth, async (req, res) => {
    try {
        const coupons = await Coupon.find()
            .sort({ createdAt: -1 });

        res.json({
            total: coupons.length,
            coupons,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ✅ GET SINGLE COUPON
// ========================================
// router.get("/coupon/:id", CheckAuth, async (req, res) => {
//     try {
//         const coupon = await Coupon.findOne({
//             _id: req.params.id,
//             franchiseId: req.user.id,
//         });

//         if (!coupon) {
//             return res.status(404).json({ message: "Coupon not found" });
//         }

//         res.json(coupon);

//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

router.get("/coupon/:id", CheckAuth, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json(coupon);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ✅ UPDATE COUPON
// ========================================
router.put("/updateCoupon/:id", CheckAuth, async (req, res) => {
    try {
        const { discountType, discountValue, expiry, isActive } = req.body;

        const coupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                discountType,
                discountValue,
                expiry,
                isActive,
            },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json({
            message: "Coupon updated successfully",
            coupon,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ❌ DELETE COUPON
// ========================================
router.delete("/deleteCoupon/:id", CheckAuth, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json({
            message: "Coupon deleted successfully",
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ✅ APPLY COUPON (USER SIDE)
// ========================================
router.post("/applyCoupon", CheckAuth, async (req, res) => {
    try {
        const { code, amount } = req.body;

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(400).json({ message: "Invalid coupon" });
        }

        // ❌ Expiry check
        if (coupon.expiry && coupon.expiry < new Date()) {
            return res.status(400).json({ message: "Coupon expired" });
        }

        // ❌ Already used
        const alreadyUsed = coupon.usedBy.some(
            (u) => u.userId.toString() === req.user.id
        );

        if (alreadyUsed) {
            return res.status(400).json({
                message: "You already used this coupon",
            });
        }

        // ✅ Discount calculation
        let discount = 0;
        const baseAmount = Number(amount);

        if (coupon.discountType === "percent") {
            discount = (baseAmount * coupon.discountValue) / 100;
        } else {
            discount = Math.min(coupon.discountValue, baseAmount);
        }

        const netAmount = Math.max(baseAmount - discount, 0);
        const gst = netAmount * 0.18;
        const finalAmount = netAmount + gst;

        res.json({
            discount,
            gst,
            finalAmount,
            couponCode: coupon.code,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ========================================
// ✅ MARK COUPON USED (PAYMENT SUCCESS)
// ========================================
router.post("/markUsed", CheckAuth, async (req, res) => {
    try {
        const { code } = req.body;

        await Coupon.updateOne(
            { code: code.toUpperCase() },
            {
                $push: {
                    usedBy: {
                        userId: req.user.id,
                        usedAt: new Date(),
                    },
                },
            }
        );

        res.json({ message: "Coupon marked as used" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;