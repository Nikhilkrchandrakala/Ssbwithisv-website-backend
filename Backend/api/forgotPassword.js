const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    try {
        const { phone, newPassword } = req.body;

        if (!phone || !newPassword) {
            return res.status(400).json({
                error: "Phone and new password are required",
            });
        }

        const user = await UserDetails.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

       
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            status: "ok",
            message: "Password reset successfully",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
