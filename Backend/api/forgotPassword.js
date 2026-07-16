const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { UserDetails } = require("../model/UserDetails");
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");

router.post("/forgot-password", async (req, res) => {
    try {
        const { phone, email, newPassword } = req.body;
        console.log("Forgot Password Request received payload:", { phone, email, hasNewPassword: !!newPassword });

        if ((!phone && !email) || !newPassword) {
            console.log("Forgot Password validation failed: Missing required fields");
            return res.status(400).json({
                error: "Phone or Email and new password are required",
            });
        }

        // Build a flexible search query for phone (suffix match of last 10 digits) or email (trimmed & lowercased)
        const cleanPhone = phone ? phone.toString().replace(/\D/g, "") : null;
        const last10 = cleanPhone && cleanPhone.length >= 10 ? cleanPhone.slice(-10) : null;
        console.log("Phone parsing results:", { cleanPhone, last10 });

        const buildQuery = (emailField, phoneField) => {
            let query = null;
            if (phone) {
                if (last10) {
                    query = { [phoneField]: { $regex: new RegExp(last10 + "$") } };
                } else {
                    query = { [phoneField]: phone.toString() };
                }
            } else if (email) {
                query = { [emailField]: email.toLowerCase().trim() };
            }
            console.log(`buildQuery logic (${emailField}, ${phoneField}) built:`, query);
            return query;
        };

        let userFound = false;

        // 1. Search and Update standard UserDetails
        const userQuery = buildQuery("email", "phone");
        if (userQuery) {
            console.log("Searching UserDetails collection with query:", userQuery);
            let userDoc = await UserDetails.findOne(userQuery);
            if (userDoc) {
                if (userDoc.role === "assessor") {
                    console.log("Assessor found in UserDetails. Resetting password...");
                    // UserDetails schema has auto-hash middleware
                    userDoc.password = newPassword;
                    await userDoc.save();
                    userFound = true;
                    console.log("UserDetails (Assessor) password updated successfully");
                } else {
                    console.log(`User found in UserDetails has role '${userDoc.role}', not 'assessor'. Rejecting password recovery.`);
                }
            } else {
                console.log("User not found in UserDetails collection");
            }
        }

        // 2. Search and Update AdminUser
        const adminQuery = buildQuery("email", "phone");
        if (adminQuery) {
            console.log("Searching AdminUser collection with query:", adminQuery);
            let adminDoc = await AdminUser.findOne(adminQuery);
            if (adminDoc) {
                console.log("User found in AdminUser. Resetting password...");
                // AdminUser schema has auto-hash middleware
                adminDoc.password = newPassword;
                await adminDoc.save();
                userFound = true;
                console.log("AdminUser password updated successfully");
            } else {
                console.log("User not found in AdminUser collection");
            }
        }

        // 3. Search and Update Franchise Partner
        const franchiseQuery = buildQuery("email", "phone");
        if (franchiseQuery) {
            console.log("Searching Franchise collection with query:", franchiseQuery);
            let franchiseDoc = await Franchise.findOne(franchiseQuery);
            if (franchiseDoc) {
                console.log("User found in Franchise. Resetting password...");
                const hash = await bcrypt.hash(newPassword, 10);
                franchiseDoc.password = hash;
                await franchiseDoc.save();
                userFound = true;
                console.log("Franchise password updated successfully");
            } else {
                console.log("User not found in Franchise collection");
            }
        }

        if (!userFound) {
            console.log("Forgot Password failure: No account matched query across all collections");
            return res.status(404).json({
                error: "User account not found",
            });
        }

        console.log("Forgot Password success: Password reset completed");
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
