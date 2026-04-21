// routes/slotRoutes.js

const express = require("express");
const router = express.Router();
const Slot = require("../model/Slot");
const checkAuth = require("../middlewares/CheckAuth");


// ✅ CREATE SLOT
router.post("/addSlot", checkAuth, async (req, res) => {
    try {
        const { title, startTime, endTime, maxStudents, price } = req.body;

        const slot = new Slot({
            title,
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

module.exports = router;