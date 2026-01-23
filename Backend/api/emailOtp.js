const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const EmailOtp = require("../model/EmailOtp");

// 🔹 reusable transporter (OTP ONLY)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * SEND EMAIL OTP
 */
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP (5 min)
        await EmailOtp.findOneAndUpdate(
            { email },
            {
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
            { upsert: true }
        );

        await transporter.sendMail({
            from: `"SSB With ISV" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your OTP Code",
            html: `
                <div style="font-family: Arial">
                 <p>OTP to download SSB with ISV current affairs magazine is ${otp}. Check out ROGER THAT WITH NKC on YouTube. Regards, Team SSB with ISV, a unit of CS Joint Services Academy.</p>
                </div>
            `,
        });

        res.json({ success: true, message: "OTP sent" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "OTP failed" });
    }
});

/**
 * VERIFY EMAIL OTP
 */
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        const record = await EmailOtp.findOne({ email });

        if (!record) return res.status(400).json({ message: "OTP not found" });
        if (record.expiresAt < Date.now())
            return res.status(400).json({ message: "OTP expired" });
        if (record.otp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });

        await EmailOtp.deleteOne({ email });

        res.json({ success: true, message: "OTP verified" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verify failed" });
    }
});

module.exports = router;
