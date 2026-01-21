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

        // Check existing use
        const existingUser = await UserDetails.findOne({
            $or: [{ email }, { phone }],
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Create user
        const newUser = new UserDetails({
            name,
            email,
            phone,
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
