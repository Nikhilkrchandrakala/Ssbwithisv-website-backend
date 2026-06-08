const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, emailVerifyToken, phoneVerifyToken } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // ─── Password strength validation (server-side enforcement) ───
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: "Password must contain at least one number" });
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return res.status(400).json({ error: "Password must contain at least one special character" });
        }

        // ─── Verify that email and phone were actually verified via OTP ───
        let signupOtp;
        try {
            signupOtp = require("./signupOtp");
        } catch (e) {
            // fallback if module not loaded yet
        }

        const verificationTokens = signupOtp ? signupOtp.verificationTokens : null;

        if (verificationTokens) {
            const emailLower = email.toLowerCase().trim();
            const cleanPhone = phone.toString().replace(/\D/g, "");
            const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

            // Check email verification token
            const emailEntry = verificationTokens.get(`email:${emailLower}`);
            if (!emailEntry || emailEntry.token !== emailVerifyToken || emailEntry.expiresAt < Date.now()) {
                return res.status(400).json({ error: "Email not verified. Please complete email verification first." });
            }

            // Check phone verification token
            const phoneEntry = verificationTokens.get(`phone:${last10}`);
            if (!phoneEntry || phoneEntry.token !== phoneVerifyToken || phoneEntry.expiresAt < Date.now()) {
                return res.status(400).json({ error: "Phone number not verified. Please complete phone verification first." });
            }

            // Clean up used tokens
            verificationTokens.delete(`email:${emailLower}`);
            verificationTokens.delete(`phone:${last10}`);
        }

        const emailLower = email.toLowerCase().trim();
        const cleanPhone = phone.toString().replace(/\D/g, "");
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        // Check existing user
        const existingUser = await UserDetails.findOne({
            $or: [
                { email: { $regex: new RegExp("^" + emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } },
                { phone: { $regex: new RegExp(last10 + "$") } }
            ],
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Create user with verified flags
        const newUser = new UserDetails({
            name: name.trim(),
            email: emailLower,
            phone: cleanPhone,
            password, // hashed automatically by pre-save hook
            emailVerified: true,
            phoneVerified: true,
        });

        await newUser.save();

        res.status(201).json({
            status: "ok",
            message: "User registered successfully",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
