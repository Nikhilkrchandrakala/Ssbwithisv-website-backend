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

        // Build a flexible search query for phone (suffix match of last 10 digits) or email (trimmed & lowercased)
        const cleanPhone = phone ? phone.toString().replace(/\D/g, "") : null;
        const last10 = cleanPhone && cleanPhone.length >= 10 ? cleanPhone.slice(-10) : null;

        const buildQuery = (emailField, phoneField) => {
            if (phone) {
                if (last10) {
                    return { [phoneField]: { $regex: new RegExp(last10 + "$") } };
                }
                return { [phoneField]: phone.toString() };
            } else if (email) {
                return { [emailField]: email.toLowerCase().trim() };
            }
            return null;
        };

        let userFound = false;

        // 1. Search and Update standard UserDetails
        const userQuery = buildQuery("email", "phone");
        let userDoc = userQuery ? await UserDetails.findOne(userQuery) : null;
        if (userDoc) {
            // UserDetails schema has auto-hash middleware
            userDoc.password = newPassword;
            await userDoc.save();
            userFound = true;
        }

        // 2. Search and Update AdminUser
        const adminQuery = buildQuery("email", "phone");
        let adminDoc = adminQuery ? await AdminUser.findOne(adminQuery) : null;
        if (adminDoc) {
            // AdminUser schema has auto-hash middleware
            adminDoc.password = newPassword;
            await adminDoc.save();
            userFound = true;
        }

        // 3. Search and Update Franchise Partner
        const franchiseQuery = buildQuery("email", "phone");
        let franchiseDoc = franchiseQuery ? await Franchise.findOne(franchiseQuery) : null;
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
