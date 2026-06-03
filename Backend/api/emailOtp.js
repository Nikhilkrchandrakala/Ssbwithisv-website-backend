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

        // await transporter.sendMail({
        //     from: `"SSB With ISV" <${process.env.EMAIL_USER}>`,
        //     to: email,
        //     subject: "Your OTP Code",
        //     html: `
        //         <div style="font-family: Arial">
        //          <p>OTP to download SSB with ISV current affairs magazine is ${otp}. Check out ROGER THAT WITH NKC on YouTube. Regards, Team SSB with ISV, a unit of CS Joint Services Academy.</p>
        //         </div>
        //     `,
        // });

        await transporter.sendMail({
            from: '"SSB With ISV" <info@ssbwithisv.in>',

            to: email,
            subject: "SSB with ISV - OTP Verification",
            html: `
    <html>
        <head>
            <style>
                body{
                    font-family: Arial, sans-serif;
                    background:#f4f4f4;
                    padding:20px;
                }
                .container{
                    max-width:600px;
                    margin:auto;
                    background:#ffffff;
                    padding:30px;
                    border-radius:8px;
                    box-shadow:0 4px 10px rgba(0,0,0,0.1);
                    text-align:center;
                }
                .title{
                    font-size:22px;
                    font-weight:bold;
                    margin-bottom:20px;
                }
                .otp{
                    font-size:32px;
                    font-weight:bold;
                    color:#00bfa5;
                    letter-spacing:5px;
                    margin:20px 0;
                }
                .text{
                    font-size:16px;
                    color:#555;
                    line-height:1.6;
                }
                .footer{
                    margin-top:30px;
                    font-size:14px;
                    color:#888;
                }
            </style>
        </head>

        <body>
            <div class="container">
                <div class="title">SSB with ISV OTP Verification</div>

                <p class="text">
                   Your OTP to reset your account password is:
                </p>

                <div class="otp">${otp}</div>

                <p class="text">
                    Please use this OTP to complete your verification. 
                    This OTP is valid for a limited time.
                </p>

                <p class="text">
                    Check out <b>ROGER THAT WITH NKC</b> on YouTube.
                </p>

                <div class="footer">
                    Regards,<br/>
                    <b>Team SSB with ISV</b><br/>
                    A Unit of CS Joint Services Academy
                </div>
            </div>
        </body>
    </html>
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
