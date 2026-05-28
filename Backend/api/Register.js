const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const emailLower = email.toLowerCase().trim();
        const cleanPhone = phone.toString().replace(/\D/g, "");
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        // Check existing use
        const existingUser = await UserDetails.findOne({
            $or: [
                { email: { $regex: new RegExp("^" + emailLower + "$", "i") } },
                { phone: { $regex: new RegExp(last10 + "$") } }
            ],
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Create user
        const newUser = new UserDetails({
            name: name.trim(),
            email: emailLower,
            phone: cleanPhone,
            password, // 👈 plain password (hash auto hoga)
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
