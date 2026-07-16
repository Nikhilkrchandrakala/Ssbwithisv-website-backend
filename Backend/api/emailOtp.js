const express = require("express");
const router = express.Router();
const axios = require("axios");
const { UserDetails } = require("../model/UserDetails");
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");

const MSG91_TOKEN_AUTH = process.env.MSG91_TOKEN_AUTH || "432663TzWGndK2N7sR6710de92P1";

// In-memory store for recovery email reqIds
const recoveryEmailReqIds = new Map();

/**
 * SEND EMAIL OTP (Password Recovery)
 */
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        const emailLower = email.toLowerCase().trim();

        // Restrict to admin/superadmin, franchise, and assessor roles
        const adminExists = await AdminUser.findOne({ email: { $regex: new RegExp("^" + emailLower + "$", "i") } });
        const franchiseExists = await Franchise.findOne({ email: { $regex: new RegExp("^" + emailLower + "$", "i") } });
        const userDoc = await UserDetails.findOne({ email: { $regex: new RegExp("^" + emailLower + "$", "i") } });
        const assessorExists = userDoc && userDoc.role === "assessor";

        if (!adminExists && !franchiseExists && !assessorExists) {
            console.log(`Send-OTP rejected: Email ${emailLower} is not administrative or assessor.`);
            return res.status(403).json({
                success: false,
                message: "Password recovery is restricted to administrative and assessor accounts."
            });
        }

        const response = await axios.post(
            "https://api.msg91.com/api/v5/widget/sendOtp",
            {
                identifier: emailLower,
                widgetId: "3666656b4157333035303235",
                tokenAuth: MSG91_TOKEN_AUTH,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        if (response.data.type === "success") {
            recoveryEmailReqIds.set(emailLower, response.data.message);
            res.json({ success: true, message: "OTP sent" });
        } else {
            console.error("MSG91 Recovery Email OTP send failure:", response.data);
            res.status(400).json({ success: false, message: "Failed to send OTP via MSG91" });
        }
    } catch (err) {
        console.error("Send recovery email OTP error:", err);
        res.status(500).json({ success: false, message: "OTP failed" });
    }
});

/**
 * VERIFY EMAIL OTP (Password Recovery)
 */
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

        const emailLower = email.toLowerCase().trim();
        let verified = false;

        // Allow '123456' as a bypass OTP for local testing
        if (otp === "123456") {
            verified = true;
            console.log(`[LOCAL DEV OTP BYPASS] Verified recovery email: ${emailLower} with hardcoded OTP`);
        } else {
            const reqId = recoveryEmailReqIds.get(emailLower);
            if (!reqId) return res.status(400).json({ message: "OTP session not found" });

            const response = await axios.post(
                "https://api.msg91.com/api/v5/widget/verifyOtp",
                {
                    otp,
                    reqId,
                    widgetId: "3666656b4157333035303235",
                    tokenAuth: MSG91_TOKEN_AUTH,
                },
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.type === "success") {
                verified = true;
                recoveryEmailReqIds.delete(emailLower);
            } else {
                console.error("MSG91 Recovery Email OTP verification failure:", response.data);
            }
        }

        if (verified) {
            res.json({ success: true, message: "OTP verified" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (err) {
        console.error("Verify recovery email OTP error:", err);
        res.status(500).json({ success: false, message: "Verify failed" });
    }
});

module.exports = router;
