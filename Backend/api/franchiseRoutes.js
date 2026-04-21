// routes/franchiseRoutes.js
const express = require("express");
const router = express.Router();
const Franchise = require("../model/Franchise");
const Order = require("../model/Order");
const bcrypt = require("bcryptjs");
const CheckAuth = require("../middlewares/CheckAuth");


// 🔥 GENERATE RANDOM REF CODE
const generateCode = () => {
    return "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
};


// ✅ CREATE FRANCHISE
router.post("/createFranchise", async (req, res) => {
    try {
        const { name, email, phone, commissionPercent, password } = req.body;

        if (!password) {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        const existing = await Franchise.findOne({ email });

        if (existing) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        // 🔥 HASH PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        const referralCode = generateCode();

        const franchise = new Franchise({
            name,
            email,
            phone,
            password: hashedPassword, // ✅ FIX
            referralCode,
            commissionPercent,
        });

        await franchise.save();

        res.json({
            message: "Franchise created",
            data: franchise,
            referralLink: `https://ssbwithisv.in/?ref=${referralCode}`,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ✅ GET ALL FRANCHISE
router.get("/allFranchise", async (req, res) => {
    const data = await Franchise.find().sort({ createdAt: -1 });
    res.json(data);
});


// ✅ GET SINGLE FRANCHISE + SALES
router.get("/franchiseDetails/:code", async (req, res) => {
    try {
        const franchise = await Franchise.findOne({
            referralCode: req.params.code,
        });

        if (!franchise) {
            return res.status(404).json({ message: "Not found" });
        }

        // 🔥 SLOT BASED ORDERS
        const orders = await Order.find({
            referralCode: req.params.code,
            status: "paid", // ✅ only paid orders
        })
            .populate("userId", "name email")
            .populate("slotId", "title price startTime endTime")
            .sort({ createdAt: -1 });

        // 🔥 total sales
        const totalSales = orders.reduce(
            (sum, o) => sum + (o.price || 0),
            0
        );

        // 🔥 commission
        const commission =
            (totalSales * franchise.commissionPercent) / 100;

        res.json({
            franchise,
            totalSales,
            totalOrders: orders.length,
            commission,
            orders,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// ✅ GET LOGGED-IN FRANCHISE DASHBOARD
router.get("/myDashboard", CheckAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // 🔥 find franchise (ensure userId == franchise _id OR use owner field if you have)
        const franchise = await Franchise.findById(userId);

        if (!franchise) {
            return res.status(404).json({ message: "Franchise not found" });
        }

        // 🔥 get slot orders via referral
        const orders = await Order.find({
            referralCode: franchise.referralCode,
            status: "paid", // ✅ important
        })
            .populate("userId", "name email")
            .populate("slotId", "title price startTime endTime")
            .sort({ createdAt: -1 });

        // 🔥 total sales (safe)
        const totalSales = orders.reduce(
            (sum, o) => sum + (o.price || 0),
            0
        );

        // 🔥 commission calculation
        const commissionPercent = franchise.commissionPercent || 0;
        const commission = (totalSales * commissionPercent) / 100;

        res.json({
            franchise,
            totalSales,
            totalOrders: orders.length,
            commission,
            orders,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});



// ✅ DELETE FRANCHISE
router.delete("/deleteFranchise/:id", async (req, res) => {
    try {
        const franchise = await Franchise.findById(req.params.id);

        if (!franchise) {
            return res.status(404).json({ message: "Franchise not found" });
        }

        await Franchise.findByIdAndDelete(req.params.id);

        res.json({
            message: "Franchise deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;