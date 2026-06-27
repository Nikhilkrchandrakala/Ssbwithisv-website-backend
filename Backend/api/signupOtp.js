const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const EmailOtp = require("../model/EmailOtp");
const { UserDetails } = require("../model/UserDetails");
const zohoService = require("../services/zohoService");


// ─── Server-side MSG91 credentials (no longer exposed to frontend) ───
const MSG91_TOKEN_AUTH = process.env.MSG91_TOKEN_AUTH || "432663TzWGndK2N7sR6710de92P1";
const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID || "346a776c5749333834363239";

// ─── Reusable email transporter ───
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ─── In-memory store for verification tokens (short-lived) ───
// In production you'd use Redis, but for this scale MongoDB TTL or in-memory is fine
const verificationTokens = new Map();

// Clean up expired tokens every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of verificationTokens) {
        if (val.expiresAt < now) verificationTokens.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * POST /check-user-exists
 * Check if a user already exists BEFORE sending any OTP
 */
router.post("/check-user-exists", async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ error: "Email or phone is required" });
        }

        const conditions = [];

        if (email) {
            const emailLower = email.toLowerCase().trim();
            conditions.push({ email: { $regex: new RegExp("^" + emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } });
        }

        if (phone) {
            const cleanPhone = phone.toString().replace(/\D/g, "");
            const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
            conditions.push({ phone: { $regex: new RegExp(last10 + "$") } });
        }

        const existingUser = await UserDetails.findOne({ $or: conditions });

        if (existingUser) {
            // Determine which field matched
            let matchedField = "account";
            if (email && existingUser.email.toLowerCase() === email.toLowerCase().trim()) {
                matchedField = "email";
            } else if (phone) {
                matchedField = "phone number";
            }
            return res.status(200).json({
                exists: true,
                field: matchedField,
                message: `An account with this ${matchedField} already exists. Please sign in instead.`
            });
        }

        res.status(200).json({ exists: false });
    } catch (error) {
        console.error("Check user exists error:", error);
        res.status(500).json({ error: "Server error checking user" });
    }
});

// ─── In-memory store for email reqIds ───
const emailReqIds = new Map();

/**
 * POST /signup/send-email-otp
 * Send email verification OTP during signup via MSG91
 */
router.post("/signup/send-email-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email required" });

        const emailLower = email.toLowerCase().trim();

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
            emailReqIds.set(emailLower, response.data.message);
            res.json({
                success: true,
                message: "Verification OTP sent to your email",
                reqId: response.data.message,
            });
        } else {
            console.error("MSG91 Email OTP send failure:", response.data);
            res.status(400).json({ success: false, message: "Failed to send email OTP via MSG91" });
        }
    } catch (err) {
        console.error("Send signup email OTP error:", err);
        res.status(500).json({ success: false, message: "Failed to send email OTP" });
    }
});

/**
 * POST /signup/verify-email-otp
 * Verify email OTP via MSG91 and return a verification token
 */
router.post("/signup/verify-email-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

        const emailLower = email.toLowerCase().trim();
        let verified = false;

        // Allow '123456' as a bypass OTP for local testing
        if (otp === "123456") {
            verified = true;
            console.log(`[LOCAL DEV OTP BYPASS] Verified email: ${emailLower} with hardcoded OTP`);
        } else {
            const reqId = emailReqIds.get(emailLower);
            if (!reqId) return res.status(400).json({ success: false, message: "OTP session not found. Please request a new one." });

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
                emailReqIds.delete(emailLower);
            } else {
                console.error("MSG91 Email OTP verification failure:", response.data);
            }
        }

        if (verified) {
            // Generate a short-lived verification token (15 min)
            const token = crypto.randomBytes(32).toString("hex");
            verificationTokens.set(`email:${emailLower}`, {
                token,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });

            res.json({ success: true, message: "Email verified successfully", emailVerifyToken: token });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (err) {
        console.error("Verify signup email OTP error:", err);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
});

/**
 * POST /signup/send-phone-otp
 * Proxy MSG91 sendOtp through backend (credentials stay server-side)
 */
router.post("/signup/send-phone-otp", async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone number required" });

        const cleanPhone = phone.toString().replace(/\D/g, "");
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        const response = await axios.post(
            "https://api.msg91.com/api/v5/widget/sendOtp",
            {
                identifier: `91${last10}`,
                widgetId: MSG91_WIDGET_ID,
                tokenAuth: MSG91_TOKEN_AUTH,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        if (response.data.type === "success") {
            res.json({
                success: true,
                message: "OTP sent to your phone",
                reqId: response.data.message,
            });
        } else {
            res.status(400).json({ success: false, message: "Failed to send phone OTP" });
        }
    } catch (err) {
        console.error("Send phone OTP error:", err);
        res.status(500).json({ success: false, message: "Failed to send phone OTP" });
    }
});

/**
 * POST /signup/verify-phone-otp
 * Proxy MSG91 verifyOtp through backend and return a verification token
 */
router.post("/signup/verify-phone-otp", async (req, res) => {
    try {
        const { phone, otp, reqId } = req.body;
        if (!otp || !reqId) return res.status(400).json({ success: false, message: "OTP and request ID required" });

        let verified = false;
        const cleanPhone = (phone || "").toString().replace(/\D/g, "");
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        // Allow '123456' as a bypass OTP for local testing
        if (otp === "123456") {
            verified = true;
            console.log(`[LOCAL DEV OTP BYPASS] Verified phone last10: ${last10} with hardcoded OTP`);
        } else {
            const response = await axios.post(
                "https://api.msg91.com/api/v5/widget/verifyOtp",
                {
                    otp,
                    reqId,
                    widgetId: MSG91_WIDGET_ID,
                    tokenAuth: MSG91_TOKEN_AUTH,
                },
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.type === "success") {
                verified = true;
            }
        }

        if (verified) {
            // Generate verification token
            const token = crypto.randomBytes(32).toString("hex");
            verificationTokens.set(`phone:${last10}`, {
                token,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });

            res.json({ success: true, message: "Phone verified successfully", phoneVerifyToken: token });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (err) {
        console.error("Verify phone OTP error:", err);
        res.status(500).json({ success: false, message: "Phone OTP verification failed" });
    }
});

// ─── Export for use by Register.js ───
router.verificationTokens = verificationTokens;

/**
 * POST /oauth/attach-phone
 * Called by OAuthPhoneVerify.jsx after social login for new users who have no phone yet.
 * Verifies the phone OTP via MSG91, attaches phone to user, issues full JWT.
 */
router.post("/oauth/attach-phone", async (req, res) => {
    const { tempToken, phone, otp, reqId } = req.body;

    if (!tempToken || !phone || !otp || !reqId) {
        return res.status(400).json({ success: false, message: "tempToken, phone, otp and reqId are required" });
    }

    // 1. Verify temp token
    let decoded;
    try {
        decoded = jwt.verify(tempToken, (process.env.JWT_SECRET || "").trim());
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    }

    if (!decoded.needsPhone) {
        return res.status(400).json({ success: false, message: "Invalid token type." });
    }

    const userId = decoded.id;

    // 2. Verify MSG91 phone OTP
    const cleanPhone = phone.toString().replace(/\D/g, "");
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    let verified = false;

    if (otp === "123456") {
        // Local dev bypass
        verified = true;
        console.log(`[LOCAL DEV OTP BYPASS] OAuth phone attach for userId: ${userId}`);
    } else {
        try {
            const response = await axios.post(
                "https://api.msg91.com/api/v5/widget/verifyOtp",
                {
                    otp,
                    reqId,
                    widgetId: MSG91_WIDGET_ID,
                    tokenAuth: MSG91_TOKEN_AUTH,
                },
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.type === "success") {
                verified = true;
            }
        } catch (err) {
            console.error("[OAuth attach-phone] MSG91 verify error:", err.message);
            return res.status(500).json({ success: false, message: "OTP verification failed. Please try again." });
        }
    }

    if (!verified) {
        return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // 3. Check phone isn't already taken by another user
    const existingPhoneUser = await UserDetails.findOne({
        phone: { $regex: new RegExp(last10 + "$") },
        _id: { $ne: userId }
    });
    if (existingPhoneUser) {
        return res.status(400).json({ success: false, message: "This phone number is already linked to another account." });
    }

    // 4. Attach phone to user
    const user = await UserDetails.findByIdAndUpdate(
        userId,
        { phone: last10, phoneVerified: true },
        { new: true }
    );

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    // Submit signup details to Zoho in background asynchronously
    zohoService.submitSignupLead(user).catch(err => {
        console.error("[signupOtp] Background Zoho submission failed:", err);
    });


    // 5. Issue full 30-day JWT (same as normal login)
    const token = jwt.sign(
        { id: user._id, phone: user.phone, email: user.email, role: user.role || "lead" },
        (process.env.JWT_SECRET || "").trim(),
        { expiresIn: "30d" }
    );

    res.json({
        success: true,
        message: "Phone verified and account setup complete!",
        token,
        user: {
            name: user.name,
            email: user.email,
            phone: user.phone,
        },
    });
});

module.exports = router;

