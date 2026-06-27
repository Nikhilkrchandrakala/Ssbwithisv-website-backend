const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const User = require("../model/UserDetails"); // make sure path is correct

// PUT - Update logged-in user profile
const upload = require("../middlewares/profileUpload");
const fs = require("fs");
const path = require("path");

const { UserDetails } = require("../model/UserDetails");
const Order = require("../model/Order");


// GET logged-in user details
router.get("/user/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        status: "ok",
        user: req.user,
    });
});


router.put(
    "/user/profile",
    authMiddleware,
    upload.single("profileImage"),
    async (req, res) => {
        try {
            const user = await UserDetails.findById(req.user._id);

            // console.log(user)

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const { name, email, phone, Address } = req.body;

            console.log(Address)

            if (name) user.name = name;
            if (email) user.email = email;
            if (phone) user.phone = phone;
            if (Address) user.Address = Address;

            if (req.file) {
                // console.log(req.file);
                const protocol = req.get("host").includes("localhost") ? "http" : "https";
                const BASE_URL = `${protocol}://${req.get("host")}`;
                user.profileImage = `${BASE_URL}/${req.file.path.replace(/\\/g, "/")}`;
            }

            await user.save();

            const userObj = user.toObject();
            delete userObj.password;

            res.json({
                status: "ok",
                message: "Profile updated successfully",
                user: userObj,
            });

        } catch (error) {
            res.status(500).json({
                status: "error",
                message: error.message,
            });
        }
    }
);






// routes/orderRoutes.js

router.get("/user/purchasedCourses", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const orders = await Order.find({
            userId,
            status: "paid",
        })
            .populate("slotId", "title price startTime endTime batchNo")
            .sort({ createdAt: -1 });

        res.json({
            status: "ok",
            total: orders.length,
            orders,
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message,
        });
    }
});

// Register psych test consent and attempt timestamp
router.put("/user/register-psych-consent", authMiddleware, async (req, res) => {
    try {
        const user = await UserDetails.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        user.hasPsychTheoryConsent = true;
        user.psychTestAttemptedAt = new Date();
        await user.save();
        
        const userObj = user.toObject();
        delete userObj.password;
        
        res.json({
            status: "ok",
            message: "Psychology test consent and attempt timestamp registered successfully",
            user: userObj
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

/**
 * POST /api/user/zoho-form-filled
 * Called after successful Zoho CRM lead form submission.
 * Sets zohoFormFilled = true on the user's account so future downloads are allowed.
 */
router.post("/user/zoho-form-filled", authMiddleware, async (req, res) => {
    try {
        const {
            dob, ssbAspirant, servingCandidate, vtxHeard,
            youtubeSubscribed, podcastSubscribed, ssbExperience,
            nextSsbDate, ssbBoards, ssbEntries, city, state
        } = req.body;

        const user = await UserDetails.findByIdAndUpdate(
            req.user._id,
            { 
                zohoFormFilled: true,
                dob: dob || "",
                ssbAspirant: ssbAspirant || "",
                servingCandidate: servingCandidate || "",
                vtxHeard: vtxHeard || "",
                youtubeSubscribed: youtubeSubscribed || "",
                podcastSubscribed: podcastSubscribed || "",
                ssbExperience: ssbExperience || "",
                nextSsbDate: nextSsbDate || "",
                ssbBoards: Array.isArray(ssbBoards) ? ssbBoards : [],
                ssbEntries: Array.isArray(ssbEntries) ? ssbEntries : [],
                city: city || "",
                state: state || ""
            },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
        res.json({ status: "ok", message: "Zoho form status updated", zohoFormFilled: true });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;