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

    if (phone) {
      const cleanPhone = phone.toString().replace(/\D/g, "");
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      user = await UserDetails.findOne({ phone: { $regex: new RegExp(last10 + "$") } });
    } else if (email) {
      const emailClean = email.trim();
      user = await UserDetails.findOne({ email: { $regex: new RegExp("^" + emailClean + "$", "i") } });
    }

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Block assessors, admins, and owners from using the candidate login portal
    if (user.role === "assessor" || user.role === "admin" || user.role === "owner") {
      return res.status(403).json({ error: "Access denied. Please use the admin login portal." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, email: user.email, role: user.role || "student" },
      (process.env.JWT_SECRET || '').trim(),
      { expiresIn: "30d" }
    );


    // const token = jwt.sign(
    //   { id: user._id },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "7d" }   // 👈 yaha change karo
    // );


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
