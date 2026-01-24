const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");
const bcrypt = require("bcryptjs"); // password encrypt karna best practice

router.post("/forgot-password", async (req, res) => {
    try {
        const { phone, email, newPassword } = req.body;

        if ((!phone && !email) || !newPassword) {
            return res.status(400).json({
                error: "Phone or Email and new password are required",
            });
        }

        let user;

        // ✅ CASE 1: PHONE
        if (phone) {
            user = await UserDetails.findOne({ phone });
        }
        // ✅ CASE 2: EMAIL
        else if (email) {
            user = await UserDetails.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // 🔐 hash password (recommended)
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
