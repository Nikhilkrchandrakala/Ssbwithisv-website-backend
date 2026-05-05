// routes/slotRoutes.js

const express = require("express");
const router = express.Router();
const Slot = require("../model/Slot");
const checkAuth = require("../middlewares/CheckAuth");

const { UserDetails } = require("../model/UserDetails");
const Order = require("../model/Order");



// ✅ CREATE SLOT
router.post("/addSlot", checkAuth, async (req, res) => {
    try {
        const { title, batchNo, startTime, endTime, maxStudents, price } = req.body;

        const slot = new Slot({
            title,
            batchNo,
            startTime,
            endTime,
            maxStudents,
            price,
            createdBy: req.user.id,
        });

        await slot.save();

        res.status(201).json({
            message: "Slot created successfully",
            data: slot,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ✅ GET ALL SLOTS
router.get("/allSlots", async (req, res) => {
    const slots = await Slot.find()
        .sort({ createdAt: -1 });

    res.json(slots);
});


// ✅ GET SLOT DETAIL
router.get("/slotDetail/:id", async (req, res) => {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
        return res.status(404).json({ message: "Not found" });
    }

    res.json(slot);
});


// ❌ REMOVE THIS (payment se booking hoga)
// router.post("/bookSlot/:id")


// ✅ UPDATE SLOT
router.put("/updateSlot/:id", checkAuth, async (req, res) => {
    const slot = await Slot.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json({
        message: "Slot updated",
        data: slot,
    });
});


// ✅ DELETE SLOT
router.delete("/deleteSlot/:id", checkAuth, async (req, res) => {
    await Slot.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });
});

router.post("/manualBookSlot/:id", checkAuth, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const cleanEmail = email.trim().toLowerCase();

        const slot = await Slot.findById(req.params.id);
        if (!slot) {
            return res.status(404).json({ message: "Slot not found" });
        }

        // ✅ find user (IMPORTANT: same collection as auth)
        const user = await UserDetails.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userId = user._id; // 🔥 ensure same model used everywhere

        // ✅ already booked check
        if (slot.bookedStudents.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({ message: "Already booked" });
        }

        // ✅ seat full check
        if (slot.bookedStudents.length >= slot.maxStudents) {
            return res.status(400).json({ message: "Slot is full" });
        }

        // ✅ add user (same as payment logic)
        // after slot.bookedStudents.push(userId);

        slot.bookedStudents.push(userId);
        await slot.save();

        // ✅ ALSO CREATE ORDER
        const order = new Order({
            userId: userId,
            slotId: slot._id,
            price: slot.price,
            originalAmount: slot.price,
            discount: 0,
            referralCode: null, // 🔥 Direct sale
            status: "paid", // 🔥 important
        });

        await order.save();

        res.json({
            message: "Slot booked manually successfully",
            data: slot
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ UPDATE BATCH NO ONLY (for quick edit from sales page)
router.patch("/updateBatchNo/:id", checkAuth, async (req, res) => {
    try {
        const { batchNo } = req.body;
        const slot = await Slot.findByIdAndUpdate(
            req.params.id,
            { batchNo },
            { new: true }
        );

        if (!slot) return res.status(404).json({ message: "Batch not found" });

        res.json({
            message: "Batch number updated successfully",
            data: slot
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;