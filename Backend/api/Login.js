const express = require("express");
const router = express.Router();
const { UserDetails } = require("../model/UserDetails");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({
        error: "Email or Phone and password required",
      });
    }

    let user;

    // console.log(user)

    if (phone) {
      user = await UserDetails.findOne({ phone: phone.toString() });
    } else if (email) {
      user = await UserDetails.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, email: user.email },
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
