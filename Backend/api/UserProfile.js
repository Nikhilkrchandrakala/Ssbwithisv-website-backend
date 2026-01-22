const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");

// GET logged-in user details
router.get("/user/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        status: "ok",
        user: req.user,
    });
});

module.exports = router;
