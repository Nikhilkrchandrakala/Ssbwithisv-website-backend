const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const User = require("../model/UserDetails"); // make sure path is correct

// GET logged-in user details
router.get("/user/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        status: "ok",
        user: req.user,
    });
});

// PUT - Update logged-in user profile
router.put("/user/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        const { name, email, phone } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    email,
                    phone,
                    Address: req.body.Address || null,
                },
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: "ok",
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to update profile",
            error: error.message,
        });
    }
});

module.exports = router;