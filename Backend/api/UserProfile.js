const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const User = require("../model/UserDetails"); // make sure path is correct

// PUT - Update logged-in user profile
const upload = require("../middlewares/profileUpload");
const fs = require("fs");
const path = require("path");

const { UserDetails } = require("../model/UserDetails");
const Order = require("../model/Order");


// GET logged-in user details
router.get("/user/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        status: "ok",
        user: req.user,
    });
});


router.put(
    "/user/profile",
    authMiddleware,
    upload.single("profileImage"),
    async (req, res) => {
        try {
            const user = await UserDetails.findById(req.user._id);

            // console.log(user)

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const { name, email, phone, Address } = req.body;

            console.log(Address)

            if (name) user.name = name;
            if (email) user.email = email;
            if (phone) user.phone = phone;
            if (Address) user.Address = Address;

            if (req.file) {
                // console.log(req.file);
                const BASE_URL = `${req.protocol}://${req.get("host")}`;
                user.profileImage = `${BASE_URL}/${req.file.path.replace(/\\/g, "/")}`;
            }

            await user.save();

            const userObj = user.toObject();
            delete userObj.password;

            res.json({
                status: "ok",
                message: "Profile updated successfully",
                user: userObj,
            });

        } catch (error) {
            res.status(500).json({
                status: "error",
                message: error.message,
            });
        }
    }
);



router.get("/user/purchasedCourses", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const orders = await Order.find({
            userId,
            status: "paid",
        })
            .populate("courseId", "title price thumbnail")
            .sort({ createdAt: -1 });

        res.json({
            status: "ok",
            total: orders.length,
            orders,
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message,
        });
    }
});


// 👇 last me export
// module.exports = router;


module.exports = router;