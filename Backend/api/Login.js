const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Login with Email OR Phone
router.post("/login", async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    // Validation
    if ((!phone && !email) || !password) {
      return res
        .status(400)
        .json({ error: "Email or Phone and password required" });
    }

    // Find user by phone OR email
    const user = await UserDetails.findOne({
      $or: [
        phone ? { phone } : null,
        email ? { email: email.toLowerCase() } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // JWT
    const token = jwt.sign(
      {
        id: user._id,
        phone: user.phone,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      status: "ok",
      token,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
