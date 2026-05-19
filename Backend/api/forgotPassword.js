const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { UserDetails } = require("../model/UserDetails");
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");

router.post("/forgot-password", async (req, res) => {
    try {
        const { phone, email, newPassword } = req.body;

        if ((!phone && !email) || !newPassword) {
            return res.status(400).json({
                error: "Phone or Email and new password are required",
            });
        }

        let userFound = false;

        // 1. Search and Update standard UserDetails
        let userDoc;
        if (phone) {
            userDoc = await UserDetails.findOne({ phone: phone.toString() });
        } else if (email) {
            userDoc = await UserDetails.findOne({ email: email.toLowerCase() });
        }

        if (userDoc) {
            // UserDetails schema has auto-hash middleware
            userDoc.password = newPassword;
            await userDoc.save();
            userFound = true;
        }

        // 2. Search and Update AdminUser
        let adminDoc;
        if (phone) {
            adminDoc = await AdminUser.findOne({ phone: phone.toString() });
        } else if (email) {
            adminDoc = await AdminUser.findOne({ email: email.toLowerCase() });
        }

        if (adminDoc) {
            const hash = await bcrypt.hash(newPassword, 10);
            adminDoc.password = hash;
            await adminDoc.save();
            userFound = true;
        }

        // 3. Search and Update Franchise Partner
        let franchiseDoc;
        if (phone) {
            franchiseDoc = await Franchise.findOne({ phone: phone.toString() });
        } else if (email) {
            franchiseDoc = await Franchise.findOne({ email: email.toLowerCase() });
        }

        if (franchiseDoc) {
            const hash = await bcrypt.hash(newPassword, 10);
            franchiseDoc.password = hash;
            await franchiseDoc.save();
            userFound = true;
        }

        if (!userFound) {
            return res.status(404).json({
                error: "User account not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });

    } catch (error) {
        console.error("Forgot Password Reset Error:", error);
        res.status(500).json({
            error: error.message,
        });
    }
});

module.exports = router;
