const express = require("express");
const router = express.Router();
const { AdminUser } = require("../model/AdminUser");
const Franchise = require("../model/Franchise");
const { UserDetails } = require("../model/UserDetails");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/AdminLogin", async (req, res, next) => {
    try {
        const { phone, email, password } = req.body;

        if ((!phone && !email) || !password) {
            return res.status(400).json({
                error: "Email or Phone and password required",
            });
        }

        let user;
        let role = "";

        // =========================
        // 1️⃣ ADMIN CHECK
        // =========================
        if (phone) {
            user = await AdminUser.findOne({ phone: phone.toString() });
        } else if (email) {
            user = await AdminUser.findOne({ email: email.toLowerCase() });
        }

        if (user) {
            role = "admin";
        } else {
            // =========================
            // 2️⃣ FRANCHISE CHECK
            // =========================
            if (phone) {
                user = await Franchise.findOne({ phone: phone.toString() });
            } else if (email) {
                user = await Franchise.findOne({ email: email.toLowerCase() });
            }

            if (user) {
                role = "franchise";
            }
        }

        // =========================
        // 3️⃣ ASSESSOR CHECK (in main User collection)
        // =========================
        if (!user) {
            let assessorUser = null;
            if (phone) {
                assessorUser = await UserDetails.findOne({ phone: phone.toString(), role: "assessor" });
            } else if (email) {
                assessorUser = await UserDetails.findOne({ email: email.toLowerCase(), role: "assessor" });
            }
            if (assessorUser) {
                user = assessorUser;
                role = "assessor";
            }
        }

        // ❌ NOT FOUND
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        // 🔐 PASSWORD CHECK
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password" });
        }

        // 🔑 TOKEN
        const token = jwt.sign(
            {
                id: user._id,
                role, // 🔥 important
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            status: "ok",
            role, // 🔥 frontend use karega
            token,
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;