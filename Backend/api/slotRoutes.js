// routes/slotRoutes.js

const express = require("express");
const router = express.Router();
const Slot = require("../model/Slot");
const checkAuth = require("../middlewares/CheckAuth");

const { UserDetails } = require("../model/UserDetails");
const Order = require("../model/Order");
const Course = require("../model/Course");




// ✅ CREATE SLOT
router.post("/addSlot", checkAuth, async (req, res) => {
    try {
        const { title, batchNo, startTime, endTime, maxStudents, price, isFullCourse } = req.body;

        const slot = new Slot({
            title,
            batchNo,
            startTime,
            endTime,
            maxStudents,
            price,
            isFullCourse: isFullCourse || false,
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
        const { email, selectedModules } = req.body;

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
            if (modules.length === 0) {
                calculatedBaseAmount = getPrice('full_course');
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
        } else {
            calculatedBaseAmount = slot.price || getPrice('full_course');
        }

        const baseAmount = calculatedBaseAmount;
        const totalWithGst = baseAmount * 1.18;

        // ✅ add user (same as payment logic)
        slot.bookedStudents.push(userId);
        await slot.save();

        // ✅ ALSO CREATE ORDER
        const order = new Order({
            userId: userId,
            slotId: slot._id,
            price: totalWithGst,
            originalAmount: totalWithGst,
            discount: 0,
            referralCode: null, // 🔥 Direct sale
            status: "paid", // 🔥 important
            selectedModules: slot.isFullCourse ? (modules.length > 0 ? modules : ['full_course']) : [],
            bookingMethod: 'manual', // 🔥 Admin manually booked this slot
        });

        await order.save();

        // 🔥 Synchronize User Profile Immediately & Bump updatedAt
        let userModified = false;
        
        if (slot.batchNo) {
            user.batch = slot.batchNo.trim();
            userModified = true;
        }

        const bookedModules = order.selectedModules;
        if (bookedModules.length === 1 && bookedModules[0] !== 'full_course') {
            user.clinicalStage = bookedModules[0];
            userModified = true;
        } else if (bookedModules.includes('full_course') || bookedModules.length > 1) {
            user.clinicalStage = 'full_course';
            userModified = true;
        }

        // We forcefully save to trigger Mongoose `updatedAt` update even if nothing strictly changed,
        // so the student jumps to the top of the Student Roster.
        user.markModified('updatedAt'); 
        await user.save();

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