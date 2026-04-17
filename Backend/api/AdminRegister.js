const express = require("express");
const router = express.Router();
const { AdminUser } = require("../model/AdminUser");

// Register
router.post("/AdminRegister", async (req, res) => {
    try {
        const { email, password  } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check existing use
        const existingUser = await AdminUser.findOne({
            $or: [{ email }],
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Create user
        const newUser = new UserDetails({

            email,
            // role:'admin',
            // phone,
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
