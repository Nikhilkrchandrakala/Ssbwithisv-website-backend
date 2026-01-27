const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");

router.post("/forgot-password", async (req, res) => {
    try {
        const { phone, email, newPassword } = req.body;

        if ((!phone && !email) || !newPassword) {
            return res.status(400).json({
                error: "Phone or Email and new password are required",
            });
        }

        let user;

        if (phone) {
            user = await UserDetails.findOne({ phone: phone.toString() });
        } else if (email) {
            user = await UserDetails.findOne({ email: email.toLowerCase() });
        }

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // ✅ DO NOT hash here (schema will hash automatically)
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });

    } catch (error) {
        res.status(500).json({
            error: error.message,
        });
    }
});

module.exports = router;
